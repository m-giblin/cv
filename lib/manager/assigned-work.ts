import type { SupabaseClient } from "@supabase/supabase-js";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import { quizAttemptScores } from "@/lib/question-bank/model";
import { daysBetween, dueLabel, loadAssignments, todayIso, type AssignmentState } from "@/lib/playbooks/assignments";

/**
 * Everything a manager has assigned, in one list: playbooks, simulations, pitches and ramp tasks,
 * each with a due date and a plain status. Uses the service role; callers check who may see whom.
 */

export type AssignedWorkKind = "playbook" | "simulation" | "pitch" | "ramp_task" | "quiz";

export type AssignedWorkItem = {
  id: string;
  kind: AssignedWorkKind;
  title: string;
  /** Second line: what counts as done, or progress so far. */
  detail: string;
  assigneeId: string;
  assigneeName: string;
  dueDate: string | null;
  state: AssignmentState;
  /** "Due in 3 days", "2 days overdue", "Done". */
  dueText: string;
  createdAt: string;
  /** Whether the manager can cancel it from the list (simulations and ramp tasks can only be re-dated). */
  cancellable: boolean;
  /** A chapter assignment whose knowledge check counts; the manager can open the answers. */
  hasQuiz?: boolean;
  /** Where the assignee does it, when that's a specific page (knowledge checks). */
  href?: string;
};

const DONE_STATUSES = new Set(["submitted", "under_review", "reviewed", "completed"]);

/** Loose client for tables the generated types don't know yet. */
function loose(client: unknown) {
  return client as SupabaseClient;
}

function stateFor(done: boolean, started: boolean, dueDate: string | null, today: string): AssignmentState {
  if (done) return "done";
  if (dueDate && dueDate < today) return "overdue";
  return started ? "in_progress" : "not_started";
}

function dueTextFor(state: AssignmentState, dueDate: string | null, today: string) {
  if (state === "done") return "Done";
  if (!dueDate) return "No due date";
  return dueLabel({ state, parts: [], daysLeft: daysBetween(today, dueDate) }, dueDate);
}

export async function loadAssignedWork(tenantId: string, assigneeIds: string[]): Promise<AssignedWorkItem[]> {
  const admin = getTenantAdminClient();
  if (!admin || !assigneeIds.length) return [];
  const db = loose(admin);
  const today = todayIso();

  const [playbooks, people, sims, pitches, plans] = await Promise.all([
    loadAssignments(tenantId, { assigneeIds, includeClosed: true }),
    db.from("profiles").select("id, full_name").in("id", assigneeIds),
    db
      .from("simulation_assignments")
      .select("id, assigned_to, template_id, persona, solution_focus, status, due_date, created_at")
      .in("assigned_to", assigneeIds)
      .order("created_at", { ascending: false })
      .limit(200),
    db
      .from("pitch_assignments")
      .select("id, assigned_to, scenario_id, due_date, note, status, completed_at, created_at")
      .eq("tenant_id", tenantId)
      .in("assigned_to", assigneeIds)
      .neq("status", "cancelled"),
    db.from("plan_assignments").select("id, user_id").in("user_id", assigneeIds),
  ]);

  const nameById = new Map(((people.data ?? []) as { id: string; full_name: string }[]).map((row) => [row.id, row.full_name]));
  const nameOf = (id: string) => nameById.get(id) ?? "Team member";
  const items: AssignedWorkItem[] = [];

  for (const assignment of playbooks) {
    const done = assignment.progress.parts.filter((part) => part.done).length;
    items.push({
      id: assignment.id,
      kind: "playbook",
      title: `Ch. ${assignment.chapter} ${assignment.playbookTitle}`,
      detail: `${done} of ${assignment.progress.parts.length} parts done: ${assignment.progress.parts.map((part) => part.label.toLowerCase()).join(", ")}`,
      assigneeId: assignment.assignedTo,
      assigneeName: assignment.assigneeName,
      dueDate: assignment.dueDate,
      state: assignment.progress.state,
      dueText: dueTextFor(assignment.progress.state, assignment.dueDate, today),
      createdAt: assignment.createdAt,
      cancellable: assignment.status === "active",
      hasQuiz: assignment.progress.parts.some((part) => part.key === "quiz"),
    });
  }

  type SimRow = {
    id: string;
    assigned_to: string;
    template_id: string | null;
    persona: string;
    solution_focus: string;
    status: string;
    due_date: string | null;
    created_at: string;
  };
  const simRows = (sims.data ?? []) as SimRow[];
  const templateIds = [...new Set(simRows.map((row) => row.template_id).filter((id): id is string => Boolean(id)))];
  const templates = templateIds.length
    ? await db.from("simulation_templates").select("id, name").in("id", templateIds)
    : { data: [] };
  const templateName = new Map(((templates.data ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name]));
  for (const row of simRows) {
    const state = stateFor(DONE_STATUSES.has(row.status), row.status === "in_progress", row.due_date, today);
    items.push({
      id: row.id,
      kind: "simulation",
      title: (row.template_id && templateName.get(row.template_id)) || row.persona,
      detail: `${row.solution_focus}, ${row.status.replaceAll("_", " ")}`,
      assigneeId: row.assigned_to,
      assigneeName: nameOf(row.assigned_to),
      dueDate: row.due_date,
      state,
      dueText: dueTextFor(state, row.due_date, today),
      createdAt: row.created_at,
      cancellable: false,
    });
  }

  type PitchRow = {
    id: string;
    assigned_to: string;
    scenario_id: string;
    due_date: string;
    note: string | null;
    status: string;
    completed_at: string | null;
    created_at: string;
  };
  const pitchRows = (pitches.data ?? []) as PitchRow[];
  if (pitchRows.length) {
    const scenarioIds = [...new Set(pitchRows.map((row) => row.scenario_id))];
    const [scenarios, submissions] = await Promise.all([
      db.from("pitch_scenario_templates").select("id, label").in("id", scenarioIds),
      db
        .from("pitch_submissions")
        .select("user_id, scenario_id, created_at")
        .in("scenario_id", scenarioIds)
        .in("user_id", assigneeIds),
    ]);
    const label = new Map(((scenarios.data ?? []) as { id: string; label: string }[]).map((row) => [row.id, row.label]));
    const submitted = (submissions.data ?? []) as { user_id: string; scenario_id: string; created_at: string }[];
    const toComplete: string[] = [];
    for (const row of pitchRows) {
      // Done once they submit this scenario after it was assigned.
      const done =
        row.status === "completed" ||
        submitted.some((sub) => sub.user_id === row.assigned_to && sub.scenario_id === row.scenario_id && sub.created_at >= row.created_at);
      if (done && row.status === "active") toComplete.push(row.id);
      const state = stateFor(done, false, row.due_date, today);
      items.push({
        id: row.id,
        kind: "pitch",
        title: label.get(row.scenario_id) ?? "Pitch scenario",
        detail: done ? "Submitted for review" : row.note ? `Note: ${row.note}` : "Record and submit in Pitch Studio",
        assigneeId: row.assigned_to,
        assigneeName: nameOf(row.assigned_to),
        dueDate: row.due_date,
        state,
        dueText: dueTextFor(state, row.due_date, today),
        createdAt: row.created_at,
        cancellable: !done,
      });
    }
    if (toComplete.length) {
      const now = new Date().toISOString();
      await db.from("pitch_assignments").update({ status: "completed", completed_at: now, updated_at: now }).in("id", toComplete);
    }
  }

  await addQuizItems(db, tenantId, assigneeIds, nameOf, today, items);

  const planOwner = new Map(((plans.data ?? []) as { id: string; user_id: string }[]).map((row) => [row.id, row.user_id]));
  if (planOwner.size) {
    const { data } = await db
      .from("plan_ad_hoc_steps")
      .select("id, assignment_id, title, status, due_date, created_at")
      .in("assignment_id", [...planOwner.keys()]);
    for (const row of (data ?? []) as { id: string; assignment_id: string; title: string; status: string; due_date: string | null; created_at: string }[]) {
      const owner = planOwner.get(row.assignment_id)!;
      const state = stateFor(DONE_STATUSES.has(row.status), row.status === "in_progress", row.due_date, today);
      items.push({
        id: row.id,
        kind: "ramp_task",
        title: row.title,
        detail: `Ramp task, ${row.status.replaceAll("_", " ")}`,
        assigneeId: owner,
        assigneeName: nameOf(owner),
        dueDate: row.due_date,
        state,
        dueText: dueTextFor(state, row.due_date, today),
        createdAt: row.created_at,
        cancellable: false,
      });
    }
  }

  // Open work first, soonest due on top; finished work after, most recent first.
  return items.sort((a, b) => {
    const aDone = a.state === "done" ? 1 : 0;
    const bDone = b.state === "done" ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    if (!aDone) return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
    return b.createdAt.localeCompare(a.createdAt);
  });
}

type QuizRow = {
  id: string;
  source_key: string;
  source_title: string;
  assigned_to: string;
  due_date: string;
  pass_score: number;
  note: string | null;
  status: string;
  completed_at: string | null;
  created_at: string;
};

/** Each attempt (one quiz sitting) since the assignment was made, as a percentage. */

/** Knowledge checks a manager assigned: done once a sitting since then scores at or above the pass mark. */
async function addQuizItems(
  db: SupabaseClient,
  tenantId: string,
  assigneeIds: string[],
  nameOf: (id: string) => string,
  today: string,
  items: AssignedWorkItem[],
) {
  const { data, error } = await db
    .from("quiz_assignments")
    .select("id, source_key, source_title, assigned_to, due_date, pass_score, note, status, completed_at, created_at")
    .eq("tenant_id", tenantId)
    .in("assigned_to", assigneeIds)
    .neq("status", "cancelled");
  if (error || !data?.length) return;
  const rows = data as QuizRow[];
  const { data: attemptRows } = await db
    .from("question_attempts")
    .select("question_id, user_id, quiz_id, correct, created_at")
    .eq("tenant_id", tenantId)
    .in("user_id", assigneeIds)
    .gte("created_at", rows.reduce((min, row) => (row.created_at < min ? row.created_at : min), rows[0]!.created_at));
  const attempts = (attemptRows ?? []) as { question_id: string; user_id: string; quiz_id: string; correct: boolean; created_at: string }[];
  const questionIds = [...new Set(attempts.map((row) => row.question_id))];
  const { data: questions } = questionIds.length
    ? await db.from("question_bank").select("id, source_kind, playbook_id, topic").in("id", questionIds)
    : { data: [] };
  const keyOf = new Map(
    ((questions ?? []) as { id: string; source_kind: string; playbook_id: string | null; topic: string }[]).map((row) => [
      row.id,
      row.source_kind === "playbook" ? `playbook:${row.playbook_id}` : `${row.source_kind}:${row.topic.trim().toLowerCase()}`,
    ]),
  );

  const toComplete: string[] = [];
  for (const row of rows) {
    const sittings = quizAttemptScores(
      attempts.filter((attempt) => attempt.user_id === row.assigned_to && attempt.created_at >= row.created_at && keyOf.get(attempt.question_id) === row.source_key),
    );
    const best = sittings.reduce((max, sitting) => Math.max(max, sitting.score), -1);
    const done = row.status === "completed" || best >= row.pass_score;
    if (done && row.status === "active") toComplete.push(row.id);
    const state: AssignmentState = done ? "done" : row.due_date < today ? "overdue" : sittings.length ? "in_progress" : "not_started";
    items.push({
      id: row.id,
      kind: "quiz",
      title: row.source_title,
      detail: sittings.length
        ? `Best ${best}% (pass ${row.pass_score}%) · ${sittings.length} attempt${sittings.length === 1 ? "" : "s"}`
        : `Pass mark ${row.pass_score}%${row.note ? ` · ${row.note}` : ""}`,
      assigneeId: row.assigned_to,
      assigneeName: nameOf(row.assigned_to),
      dueDate: row.due_date,
      state,
      dueText: dueTextFor(state, row.due_date, today),
      createdAt: row.created_at,
      cancellable: !done,
      href: `/learn/knowledge-checks?source=${encodeURIComponent(row.source_key)}`,
    });
  }
  if (toComplete.length) {
    const now = new Date().toISOString();
    await db.from("quiz_assignments").update({ status: "completed", completed_at: now, updated_at: now }).in("id", toComplete);
  }
}

export { quizAttemptScores };
