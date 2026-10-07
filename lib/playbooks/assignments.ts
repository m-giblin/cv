import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import {
  computeAssignmentProgress,
  todayIso,
  type AssignmentStatus,
  type PlaybookAssignment,
} from "@/lib/playbooks/assignment-model";

export * from "@/lib/playbooks/assignment-model";

/** Loading and recording for playbook assignments (service role). */

type AssignmentRow = {
  id: string;
  playbook_id: string;
  assigned_to: string;
  assigned_by: string | null;
  due_date: string;
  require_read: boolean;
  require_pitch: boolean;
  require_objections: boolean;
  pitch_pass_score: number;
  note: string | null;
  status: AssignmentStatus;
  completed_at: string | null;
  created_at: string;
};

const ASSIGNMENT_COLUMNS =
  "id, playbook_id, assigned_to, assigned_by, due_date, require_read, require_pitch, require_objections, pitch_pass_score, note, status, completed_at, created_at";

/**
 * Loads assignments with names and live progress. Scope by assignee (one person's list) or by a
 * set of people (a manager's team). Uses the service role; callers decide who may see what.
 * Assignments whose parts are all done are marked completed as they're read.
 */
export async function loadAssignments(
  tenantId: string,
  filter: { assigneeIds: string[]; includeClosed?: boolean },
): Promise<PlaybookAssignment[]> {
  const admin = getTenantAdminClient();
  if (!admin || !filter.assigneeIds.length) return [];

  let query = admin
    .from("playbook_assignments")
    .select(ASSIGNMENT_COLUMNS)
    .eq("tenant_id", tenantId)
    .in("assigned_to", filter.assigneeIds)
    .order("due_date");
  query = filter.includeClosed ? query.neq("status", "cancelled") : query.eq("status", "active");
  const { data } = await query;
  const rows = (data ?? []) as AssignmentRow[];
  if (!rows.length) return [];

  const playbookIds = [...new Set(rows.map((row) => row.playbook_id))];
  const userIds = [...new Set(rows.flatMap((row) => [row.assigned_to, row.assigned_by].filter((id): id is string => Boolean(id))))];
  const assigneeIds = [...new Set(rows.map((row) => row.assigned_to))];

  const [playbooks, people, reads, results] = await Promise.all([
    admin.from("capability_playbooks").select("id, title, slug, chapter").in("id", playbookIds),
    admin.from("profiles").select("id, full_name").in("id", userIds),
    admin.from("playbook_reads").select("playbook_id, user_id, read_at").in("playbook_id", playbookIds).in("user_id", assigneeIds),
    admin
      .from("playbook_drill_results")
      .select("playbook_id, user_id, kind, score")
      .in("playbook_id", playbookIds)
      .in("user_id", assigneeIds),
  ]);

  const playbookById = new Map(
    ((playbooks.data ?? []) as { id: string; title: string; slug: string; chapter: number }[]).map((row) => [row.id, row]),
  );
  const nameById = new Map(((people.data ?? []) as { id: string; full_name: string }[]).map((row) => [row.id, row.full_name]));
  const key = (playbookId: string, userId: string) => `${playbookId}:${userId}`;
  const readAt = new Map(
    ((reads.data ?? []) as { playbook_id: string; user_id: string; read_at: string }[]).map((row) => [key(row.playbook_id, row.user_id), row.read_at]),
  );
  const pitchScores = new Map<string, number[]>();
  const objectionScores = new Map<string, (number | null)[]>();
  for (const row of (results.data ?? []) as { playbook_id: string; user_id: string; kind: string; score: number | null }[]) {
    const target = row.kind === "pitch" ? pitchScores : objectionScores;
    const list = target.get(key(row.playbook_id, row.user_id)) ?? [];
    if (row.kind === "pitch" && row.score === null) continue;
    list.push(row.score as number);
    target.set(key(row.playbook_id, row.user_id), list);
  }

  const today = todayIso();
  const toComplete: string[] = [];
  const assignments = rows
    .filter((row) => playbookById.has(row.playbook_id))
    .map((row) => {
      const playbook = playbookById.get(row.playbook_id)!;
      const pair = key(row.playbook_id, row.assigned_to);
      const base = {
        id: row.id,
        playbookId: row.playbook_id,
        playbookTitle: playbook.title,
        playbookSlug: playbook.slug,
        chapter: playbook.chapter,
        assignedTo: row.assigned_to,
        assigneeName: nameById.get(row.assigned_to) ?? "Team member",
        assignedBy: row.assigned_by,
        assignedByName: row.assigned_by ? (nameById.get(row.assigned_by) ?? null) : null,
        dueDate: row.due_date,
        requireRead: row.require_read,
        requirePitch: row.require_pitch,
        requireObjections: row.require_objections,
        pitchPassScore: row.pitch_pass_score,
        note: row.note,
        status: row.status,
        completedAt: row.completed_at,
        createdAt: row.created_at,
      };
      const progress = computeAssignmentProgress(
        base,
        {
          readAt: readAt.get(pair) ?? null,
          pitchScores: pitchScores.get(pair) ?? [],
          objectionScores: objectionScores.get(pair) ?? [],
        },
        today,
      );
      if (row.status === "active" && progress.state === "done") toComplete.push(row.id);
      return { ...base, progress };
    });

  if (toComplete.length) {
    const now = new Date().toISOString();
    await admin.from("playbook_assignments").update({ status: "completed", completed_at: now, updated_at: now }).in("id", toComplete);
    for (const assignment of assignments) {
      if (toComplete.includes(assignment.id)) {
        assignment.status = "completed";
        assignment.completedAt = now;
      }
    }
  }
  return assignments;
}

/** Records a scored drill attempt against the playbook it came from (service role). */
export async function recordDrillResult(input: {
  tenantId: string;
  playbookId: string;
  userId: string;
  kind: "pitch" | "objections";
  score: number | null;
  scenarioId?: string | null;
  simulationAssignmentId?: string | null;
}) {
  const admin = getTenantAdminClient();
  if (!admin) return;
  await admin.from("playbook_drill_results").insert({
    tenant_id: input.tenantId,
    playbook_id: input.playbookId,
    user_id: input.userId,
    kind: input.kind,
    score: input.score,
    scenario_id: input.scenarioId ?? null,
    simulation_assignment_id: input.simulationAssignmentId ?? null,
  });
}
