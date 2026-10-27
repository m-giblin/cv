import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";
import {
  EMPTY_RECORDS,
  MENTOR_EVENT_TYPES,
  buildMenteeRecords,
  type MenteeRecords,
  type MentorEventRow,
  type MentorEventType,
} from "@/lib/mentoring/mentor-records-model";

type Db = SupabaseClient<Database>;

export class MentorAccessError extends Error {}

const ADMIN_ROLES = ["director", "admin", "super_admin"];

export type MenteeRelationship = "admin" | "manager" | "mentor";

/** home_tenant_id isn't in the generated types yet, so profile rows are read with select("*"). */
export type ViewerProfile = { role: string | null; tenant_id: string | null; home_tenant_id?: string | null };

/** Super admins have no tenant_id; their home tenant is where they also manage and mentor. */
export function viewerTenantId(viewer: ViewerProfile | null): string | null {
  return viewer?.tenant_id ?? viewer?.home_tenant_id ?? null;
}

/**
 * How the signed-in person relates to a mentee. Managers and the person who assigned the program
 * can write the hiring brief. Mentors can read it. Admins can do both, inside the same tenant.
 */
export async function menteeRelationship(admin: Db, viewerId: string, menteeId: string): Promise<MenteeRelationship | null> {
  const [{ data: viewerRow }, { data: mentee }] = await Promise.all([
    admin.from("profiles").select("*").eq("id", viewerId).maybeSingle(),
    admin.from("profiles").select("manager_id, tenant_id").eq("id", menteeId).maybeSingle(),
  ]);
  const viewer = viewerRow as ViewerProfile | null;
  const viewerTenant = viewerTenantId(viewer);
  if (!viewer || !viewerTenant || !mentee || viewerTenant !== mentee.tenant_id) return null;
  if (ADMIN_ROLES.includes(viewer.role ?? "")) return "admin";
  if (mentee.manager_id === viewerId) return "manager";
  const { data: assignments } = await admin
    .from("plan_assignments")
    .select("mentor_id, assigned_by")
    .eq("user_id", menteeId)
    .eq("tenant_id", viewerTenant);
  if (assignments?.some((row) => row.assigned_by === viewerId)) return "manager";
  if (assignments?.some((row) => row.mentor_id === viewerId)) return "mentor";
  return null;
}

export type MentorAssignment = {
  id: string;
  user_id: string;
  mentor_id: string | null;
  assigned_by: string | null;
  tenant_id: string | null;
};

/** The active assignment the signed-in person mentors, or throws. */
export async function requireMentoredAssignment(admin: Db, mentorId: string, assignmentId: string): Promise<MentorAssignment> {
  const { data } = await admin
    .from("plan_assignments")
    .select("id, user_id, mentor_id, assigned_by, tenant_id")
    .eq("id", assignmentId)
    .maybeSingle();
  if (!data || data.mentor_id !== mentorId) throw new MentorAccessError("You are not the assigned mentor for this program.");
  return data;
}

export type MentoredStep = {
  assignment: MentorAssignment;
  step: { id: string; plan_step_id: string; due_date: string | null; status: string };
  planStep: { title: string; metadata: unknown; sort_order: number };
};

/** A step in a program the signed-in person mentors, or throws. */
export async function requireMentoredStep(admin: Db, mentorId: string, assignmentStepId: string): Promise<MentoredStep> {
  const { data: step } = await admin
    .from("plan_assignment_steps")
    .select("id, assignment_id, plan_step_id, due_date, status")
    .eq("id", assignmentStepId)
    .maybeSingle();
  if (!step) throw new MentorAccessError("Step not found.");
  const assignment = await requireMentoredAssignment(admin, mentorId, step.assignment_id);
  const { data: planStep } = await admin
    .from("plan_steps")
    .select("title, metadata, sort_order")
    .eq("id", step.plan_step_id)
    .maybeSingle();
  return {
    assignment,
    step,
    planStep: planStep ?? { title: "Plan step", metadata: {}, sort_order: 0 },
  };
}

export async function recordMentorEvent(
  admin: Db,
  params: {
    menteeId: string;
    actorId: string;
    tenantId: string | null;
    type: MentorEventType;
    title: string;
    metadata: Record<string, Json>;
  },
): Promise<string> {
  const { data, error } = await admin
    .from("activity_logs")
    .insert({
      user_id: params.menteeId,
      actor_id: params.actorId,
      event_type: params.type,
      title: params.title,
      metadata: params.metadata,
      tenant_id: params.tenantId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

/** Hiring manager and whoever assigned the program (the people who approve gates and date changes), minus the actor. */
export async function approversFor(admin: Db, assignment: MentorAssignment, actorId: string): Promise<string[]> {
  const { data: mentee } = await admin.from("profiles").select("manager_id").eq("id", assignment.user_id).maybeSingle();
  const ids = [mentee?.manager_id, assignment.assigned_by].filter((id): id is string => Boolean(id) && id !== actorId);
  return [...new Set(ids)];
}

/** Mentor records for each mentee, keyed by mentee id. */
export async function loadMentorRecords(admin: Db, menteeIds: string[]): Promise<Map<string, MenteeRecords>> {
  const result = new Map<string, MenteeRecords>();
  if (menteeIds.length === 0) return result;
  const { data } = await admin
    .from("activity_logs")
    .select("id, user_id, actor_id, event_type, metadata, created_at")
    .in("user_id", menteeIds)
    .in("event_type", MENTOR_EVENT_TYPES)
    .order("created_at", { ascending: true })
    .limit(2000);
  const rows = (data ?? []) as MentorEventRow[];
  const actorIds = [...new Set(rows.map((row) => row.actor_id).filter((id): id is string => Boolean(id)))];
  const { data: actors } = actorIds.length
    ? await admin.from("profiles").select("id, full_name").in("id", actorIds)
    : { data: [] as { id: string; full_name: string }[] };
  const names = new Map((actors ?? []).map((row) => [row.id, row.full_name]));
  const nameOf = (id: string | null) => (id ? (names.get(id) ?? "Someone") : "Someone");
  for (const menteeId of menteeIds) {
    const own = rows.filter((row) => row.user_id === menteeId);
    result.set(menteeId, own.length ? buildMenteeRecords(own, nameOf) : EMPTY_RECORDS);
  }
  return result;
}
