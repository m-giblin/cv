import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import {
  computeAssignmentProgress,
  todayIso,
  type AssignmentStatus,
  type PlaybookAssignment,
} from "@/lib/playbooks/assignment-model";
import { quizAttemptScores } from "@/lib/question-bank/model";

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
  require_quiz?: boolean;
  quiz_pass_score?: number;
  note: string | null;
  status: AssignmentStatus;
  completed_at: string | null;
  created_at: string;
};

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
    .select("*")
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

  // Knowledge checks: each chapter's active questions, and the assignees' answers to them.
  const { data: bankRows } = await admin.from("question_bank" as never).select("id, playbook_id").eq("source_kind", "playbook").eq("status", "active").in("playbook_id", playbookIds);
  const playbookOfQuestion = new Map(((bankRows ?? []) as { id: string; playbook_id: string }[]).map((row) => [row.id, row.playbook_id]));
  const questionsPerPlaybook = new Map<string, number>();
  for (const id of playbookOfQuestion.values()) questionsPerPlaybook.set(id, (questionsPerPlaybook.get(id) ?? 0) + 1);
  const earliest = rows.reduce((min, row) => (row.created_at < min ? row.created_at : min), rows[0]!.created_at);
  const { data: attemptRows } = playbookOfQuestion.size
    ? await admin
        .from("question_attempts" as never)
        .select("question_id, user_id, quiz_id, correct, created_at")
        .in("user_id", assigneeIds)
        .in("question_id", [...playbookOfQuestion.keys()])
        .gte("created_at", earliest)
    : { data: [] };
  const quizAttempts = (attemptRows ?? []) as { question_id: string; user_id: string; quiz_id: string; correct: boolean; created_at: string }[];

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
        requireQuiz: row.require_quiz ?? true,
        quizPassScore: row.quiz_pass_score ?? 80,
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
          quizScores:
            (questionsPerPlaybook.get(row.playbook_id) ?? 0) >= 3
              ? quizAttemptScores(
                  quizAttempts.filter(
                    (attempt) => attempt.user_id === row.assigned_to && attempt.created_at >= row.created_at && playbookOfQuestion.get(attempt.question_id) === row.playbook_id,
                  ),
                ).map((sitting) => sitting.score)
              : null,
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
