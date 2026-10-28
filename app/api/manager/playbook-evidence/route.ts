import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import { loadAssignablePeople } from "@/lib/playbooks/assignment-access";
import { splitCoachMessage } from "@/lib/simulations/coach-message";

type DrillRow = {
  kind: "pitch" | "objections";
  score: number | null;
  scenario_id: string | null;
  simulation_assignment_id: string | null;
  created_at: string;
  response_text?: string | null;
  feedback?: { tips?: string[]; missed?: string[]; scores?: { label: string; score: number }[] } | null;
};

export type PitchEvidence = {
  at: string;
  score: number | null;
  label: string;
  text: string | null;
  tips: string[];
  missed: string[];
  scores: { label: string; score: number }[];
};
export type ObjectionEvidence = { at: string; score: number | null; persona: string; debrief: string | null; transcript: { speaker: string; message: string }[] };

/** ?id= (a chapter assignment): every pitch and objection drill while it was open, with what was said. */
export async function GET(request: Request) {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) return session;
  const id = new URL(request.url).searchParams.get("id") ?? "";
  const admin = getTenantAdminClient() as unknown as SupabaseClient | null;
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const { data } = await admin
    .from("playbook_assignments")
    .select("playbook_id, assigned_to, created_at, completed_at")
    .eq("tenant_id", session.tenantId)
    .eq("id", id)
    .maybeSingle();
  const assignment = data as { playbook_id: string; assigned_to: string; created_at: string; completed_at: string | null } | null;
  const people = assignment ? await loadAssignablePeople(session.tenantId, session.user.id, session.role) : [];
  if (!assignment || !people.some((person) => person.id === assignment.assigned_to)) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const { data: resultRows } = await admin
    .from("playbook_drill_results")
    .select("*")
    .eq("playbook_id", assignment.playbook_id)
    .eq("user_id", assignment.assigned_to)
    .gte("created_at", assignment.created_at)
    .order("created_at", { ascending: false });
  // Practice after the assignment finished is private again, as the chapter tells the SE.
  const rows = ((resultRows ?? []) as DrillRow[]).filter((row) => !assignment.completed_at || row.created_at <= assignment.completed_at);

  const scenarioIds = [...new Set(rows.map((row) => row.scenario_id).filter((value): value is string => Boolean(value)))];
  const simulationIds = [...new Set(rows.map((row) => row.simulation_assignment_id).filter((value): value is string => Boolean(value)))];
  const [scenarios, simulations] = await Promise.all([
    scenarioIds.length ? admin.from("pitch_scenario_templates").select("id, label").in("id", scenarioIds) : Promise.resolve({ data: [] }),
    simulationIds.length ? admin.from("simulation_assignments").select("id, persona, transcript").in("id", simulationIds) : Promise.resolve({ data: [] }),
  ]);
  const scenarioLabel = new Map(((scenarios.data ?? []) as { id: string; label: string }[]).map((row) => [row.id, row.label]));
  const simulationById = new Map(
    ((simulations.data ?? []) as { id: string; persona: string; transcript: { speaker: string; message: string }[] | null }[]).map((row) => [row.id, row]),
  );

  const pitches: PitchEvidence[] = rows
    .filter((row) => row.kind === "pitch")
    .map((row) => ({
      at: row.created_at,
      score: row.score,
      label: (row.scenario_id && scenarioLabel.get(row.scenario_id)) || "Pitch drill",
      text: row.response_text ?? null,
      tips: row.feedback?.tips ?? [],
      missed: row.feedback?.missed ?? [],
      scores: row.feedback?.scores ?? [],
    }));
  const objections: ObjectionEvidence[] = rows
    .filter((row) => row.kind === "objections")
    .map((row) => {
      const simulation = row.simulation_assignment_id ? simulationById.get(row.simulation_assignment_id) : undefined;
      const transcript = simulation?.transcript ?? [];
      // The buyer's last message carries the end-of-drill debrief: scores per objection and any unsupported claims.
      const last = [...transcript].reverse().find((entry) => entry.speaker !== "user" && entry.speaker !== "se");
      return {
        at: row.created_at,
        score: row.score,
        persona: simulation?.persona.replace(/\s*\(objection practice\)$/, "") ?? "Objection drill",
        debrief: last ? splitCoachMessage(last.message).debrief : null,
        transcript,
      };
    });
  return NextResponse.json({ pitches, objections });
}
