import type { SupabaseClient } from "@supabase/supabase-js";
import { overallPitchScore, PITCH_SHARED_EVENT } from "@/lib/pitch/pitch-step";

/** What a mentee shared from free practice, as the mentor's workbench lists it. */
export type SharedItem = {
  /** "sim:<coaching card id>" or "pitch:<practice session id>"; also the ?shared= link value. */
  ref: string;
  kind: "simulation" | "pitch";
  title: string;
  score: number | null;
  sharedAt: string;
};

export type SharedDetail =
  | {
      kind: "simulation";
      title: string;
      persona: string | null;
      score: number | null;
      strengths: string[];
      gaps: string[];
      nextPractice: string | null;
      summary: string | null;
      reflection: string | null;
      transcript: { speaker: string; message: string }[];
      sharedAt: string;
    }
  | {
      kind: "pitch";
      title: string;
      score: number | null;
      mode: string;
      pitch: string | null;
      reflection: string | null;
      scores: { label: string; score: number }[];
      sharedAt: string;
    };

const SIM_SHARED_EVENT = "simulation_shared_with_mentor";

type ActivityRow = { title: string; created_at: string; event_type: string; metadata: Record<string, unknown> | null };

/** The link value for a shared item, from its activity row; null when the row has no reference. */
export function sharedRef(row: Pick<ActivityRow, "event_type" | "metadata">): string | null {
  const meta = row.metadata ?? {};
  if (row.event_type === SIM_SHARED_EVENT && typeof meta.coachingCardId === "string") return `sim:${meta.coachingCardId}`;
  if (row.event_type === PITCH_SHARED_EVENT && typeof meta.practiceSessionId === "string") return `pitch:${meta.practiceSessionId}`;
  return null;
}

/** Everything the mentee has shared with this mentor, newest first. */
export async function listShared(admin: SupabaseClient, menteeId: string, mentorId: string): Promise<SharedItem[]> {
  const { data } = await admin
    .from("activity_logs")
    .select("title, created_at, event_type, metadata")
    .eq("user_id", menteeId)
    .in("event_type", [SIM_SHARED_EVENT, PITCH_SHARED_EVENT])
    .order("created_at", { ascending: false })
    .limit(30);
  return ((data ?? []) as ActivityRow[]).flatMap((row) => {
    const ref = sharedRef(row);
    if (!ref || (row.metadata?.mentorId && row.metadata.mentorId !== mentorId)) return [];
    return [
      {
        ref,
        kind: ref.startsWith("sim:") ? ("simulation" as const) : ("pitch" as const),
        title: row.title.replace(/^Shared with mentor:\s*/, ""),
        score: typeof row.metadata?.score === "number" ? row.metadata.score : null,
        sharedAt: row.created_at,
      },
    ];
  });
}

/** One shared item in full: the coaching card and conversation, or the pitch as delivered. */
export async function loadShared(admin: SupabaseClient, menteeId: string, item: SharedItem): Promise<SharedDetail | null> {
  const id = item.ref.split(":")[1] ?? "";
  if (item.kind === "simulation") {
    const { data: card } = await admin
      .from("coaching_cards")
      .select("structured_output, se_reflection, simulation_assignment_id")
      .eq("id", id)
      .eq("user_id", menteeId)
      .maybeSingle();
    if (!card) return null;
    const out = (card.structured_output ?? {}) as { score?: number; strengths?: string[]; gaps?: string[]; recommendedNextPractice?: string; managerSummary?: string };
    const { data: sim } = card.simulation_assignment_id
      ? await admin.from("simulation_assignments").select("persona, transcript").eq("id", card.simulation_assignment_id).maybeSingle()
      : { data: null };
    return {
      kind: "simulation",
      title: item.title,
      persona: (sim?.persona as string | undefined) ?? null,
      score: typeof out.score === "number" ? out.score : item.score,
      strengths: out.strengths ?? [],
      gaps: out.gaps ?? [],
      nextPractice: out.recommendedNextPractice ?? null,
      summary: out.managerSummary ?? null,
      reflection: (card.se_reflection as string | null) ?? null,
      transcript: ((sim?.transcript as { speaker: string; message: string }[] | null) ?? []).filter((entry) => entry.message?.trim()),
      sharedAt: item.sharedAt,
    };
  }
  const { data: session } = await admin
    .from("pitch_practice_sessions")
    .select("title, response_mode, transcript, reflection_text, ai_scores")
    .eq("id", id)
    .eq("user_id", menteeId)
    .maybeSingle();
  if (!session) return null;
  const rows = Array.isArray(session.ai_scores) ? (session.ai_scores as { label: string; score: number }[]) : [];
  return {
    kind: "pitch",
    title: (session.title as string) || item.title,
    score: overallPitchScore(rows) ?? item.score,
    mode: (session.response_mode as string) ?? "text",
    pitch: (session.transcript as string | null) ?? null,
    reflection: (session.reflection_text as string | null) ?? null,
    scores: rows.filter((row) => typeof row?.score === "number"),
    sharedAt: item.sharedAt,
  };
}
