import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import { loadAssignedWork } from "@/lib/manager/assigned-work";
import { ONE_ON_ONE_EVENT } from "@/lib/manager/one-on-ones";
import { loadMentorRecords } from "@/lib/mentoring/mentor-records";
import { loadAssignments, type PlaybookAssignment } from "@/lib/playbooks/assignments";
import { quizAttemptScores } from "@/lib/question-bank/model";
import { inBounds, matchesPhase, onboardingWindow, periodBounds, phaseOf, type RecordPeriod, type RecordPhase } from "@/lib/record/period";
import {
  scoreTone,
  summarizeRecord,
  type PersonRecord,
  type RecordEntry,
  type RecordNote,
  type RecordScore,
} from "@/lib/record/record-model";

export type { PersonRecord } from "@/lib/record/record-model";

/**
 * A person's Record: what they accomplished in a period and what people wrote about it, read straight
 * from the tables that keep it (plans, certificates, sign-offs, assignments, practice, mentor and
 * activity events) with date-range queries, not the capped team activity feed. Service role, scoped
 * to the tenant; the route checks the viewer may see this person.
 */

/** Who is looking: links go to the manager's views or to the person's own pages. */
export type RecordViewer = "manager" | "self";

type Json = Record<string, unknown>;

function loose(client: unknown) {
  return client as SupabaseClient;
}

function asObject(value: unknown): Json {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Json) : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function rubric(value: unknown): RecordScore[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asObject(item))
    .filter((item) => typeof item.label === "string" && typeof item.score === "number")
    .map((item) => ({ label: item.label as string, score: item.score as number, pass: null }));
}

function averageOf(scores: RecordScore[]) {
  const values = scores.map((score) => score.score).filter((score): score is number => typeof score === "number");
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
}

function dayText(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** Notes without a body are dropped, so a detail view never shows an empty heading. */
function notes(...items: (RecordNote | null | false | undefined)[]): RecordNote[] {
  return items.filter((note): note is RecordNote => Boolean(note && note.body.trim()));
}

function scoreHeadline(score: number | null, pass?: number | null): RecordEntry["headline"] {
  return score === null ? null : { value: String(score), tone: scoreTone(score, pass) };
}

/** Drill coaching as notes: what to do next time and what was missed. */
function drillNotes(feedback: unknown, at: string): { notes: RecordNote[]; lists: RecordEntry["lists"]; scores: RecordScore[] } {
  const data = asObject(feedback);
  const tips = strings(data.tips);
  const missed = strings(data.missed);
  return {
    notes: notes(tips.length > 0 && { label: "Coach's tips", body: tips.join(" "), author: "AI coach", at }),
    lists: missed.length ? [{ label: "Missed", items: missed }] : [],
    scores: rubric(data.scores),
  };
}

export async function loadPersonRecord(input: {
  tenantId: string;
  userId: string;
  period: RecordPeriod;
  phase: RecordPhase;
  timeZone: string;
  viewer: RecordViewer;
  /** The signed-in person; a manager sees their own coaching-session notes. */
  viewerId: string;
  now?: Date;
}): Promise<PersonRecord | null> {
  const admin = getTenantAdminClient();
  if (!admin) return null;
  const db = loose(admin);
  const { tenantId, userId, period, phase, viewer, viewerId } = input;
  const now = input.now ?? new Date();
  const bounds = periodBounds(period, input.timeZone);

  const { data: person } = await db.from("profiles").select("id, full_name").eq("id", userId).maybeSingle();
  if (!person) return null;
  const personName = person.full_name as string;

  // 1:1 events are written when scheduled, often weeks ahead, so look back far enough to catch them.
  const scheduledSince = new Date(new Date(bounds.start).getTime() - 120 * 86_400_000).toISOString();
  const [
    plansRes,
    signoffsRes,
    oneOnOnesRes,
    drillsRes,
    cardsRes,
    simsRes,
    pitchSessionsRes,
    pitchSubsRes,
    attemptsRes,
    quizRes,
    pitchAssignRes,
    contentRes,
    sessionNotesRes,
    mentorRecords,
    playbookAssignments,
    assignedWork,
  ] = await Promise.all([
    db.from("plan_assignments").select("id, plan_id, start_date, status, updated_at").eq("tenant_id", tenantId).eq("user_id", userId),
    db
      .from("manager_coaching_signoffs")
      .select("id, manager_id, review_type, review_target_id, decision, signoff_tier, strength, gap, next_action, confidence, attestation_note, created_at")
      .eq("tenant_id", tenantId)
      .eq("se_user_id", userId)
      .gte("created_at", bounds.start)
      .lt("created_at", bounds.end),
    db
      .from("activity_logs")
      .select("id, title, metadata, created_at")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .eq("event_type", ONE_ON_ONE_EVENT)
      .gte("created_at", scheduledSince)
      .lt("created_at", bounds.end),
    db
      .from("playbook_drill_results")
      .select("id, playbook_id, kind, score, scenario_id, simulation_assignment_id, response_text, feedback, created_at")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .gte("created_at", bounds.start)
      .lt("created_at", bounds.end),
    db
      .from("coaching_cards")
      .select("id, simulation_assignment_id, structured_output, is_practice, manager_comments, manager_grade, manager_review_status, se_reflection, created_at")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .gte("created_at", bounds.start)
      .lt("created_at", bounds.end),
    db
      .from("simulation_assignments")
      .select("id, assigned_by, template_id, persona, solution_focus, status, updated_at")
      .eq("tenant_id", tenantId)
      .eq("assigned_to", userId)
      .eq("status", "completed")
      .gte("updated_at", bounds.start)
      .lt("updated_at", bounds.end),
    db
      .from("pitch_practice_sessions")
      .select("id, title, scenario_id, ai_scores, reflection_text, created_at")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .gte("created_at", bounds.start)
      .lt("created_at", bounds.end),
    db
      .from("pitch_submissions")
      .select("id, title, status, manager_grade, manager_feedback, reflection_text, created_at")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .gte("created_at", bounds.start)
      .lt("created_at", bounds.end),
    db
      .from("question_attempts")
      .select("question_id, quiz_id, correct, created_at")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .gte("created_at", bounds.start)
      .lt("created_at", bounds.end),
    db
      .from("quiz_assignments")
      .select("id, completed_at")
      .eq("tenant_id", tenantId)
      .eq("assigned_to", userId)
      .eq("status", "completed")
      .gte("completed_at", bounds.start)
      .lt("completed_at", bounds.end),
    db
      .from("pitch_assignments")
      .select("id, completed_at")
      .eq("tenant_id", tenantId)
      .eq("assigned_to", userId)
      .eq("status", "completed")
      .gte("completed_at", bounds.start)
      .lt("completed_at", bounds.end),
    db
      .from("content_assignments")
      .select("id, completed_at")
      .eq("tenant_id", tenantId)
      .eq("assigned_to", userId)
      .eq("status", "completed")
      .gte("completed_at", bounds.start)
      .lt("completed_at", bounds.end),
    // A manager's coaching-session notes are their own; the person doesn't see them here.
    viewer === "manager"
      ? db
          .from("manager_coaching_session_notes")
          .select("id, session_focus, note, outcome_label, created_at")
          .eq("tenant_id", tenantId)
          .eq("se_user_id", userId)
          .eq("manager_id", viewerId)
          .gte("created_at", bounds.start)
          .lt("created_at", bounds.end)
      : Promise.resolve({ data: [] }),
    loadMentorRecords(admin as unknown as SupabaseClient<Database>, [userId]).then((map) => map.get(userId)),
    loadAssignments(tenantId, { assigneeIds: [userId], includeClosed: true }),
    loadAssignedWork(tenantId, [userId]),
  ]);

  // ── Plans, steps and certificates ─────────────────────────────────────────
  type PlanRow = { id: string; plan_id: string; start_date: string; status: string; updated_at: string };
  const plans = (plansRes.data ?? []) as PlanRow[];
  const planIds = plans.map((plan) => plan.id);
  type SignoffRow = {
    id: string;
    manager_id: string;
    review_type: string;
    review_target_id: string;
    decision: string;
    signoff_tier: string;
    strength: string;
    gap: string | null;
    next_action: string;
    confidence: number | null;
    attestation_note: string | null;
    created_at: string;
  };
  const signoffs = (signoffsRes.data ?? []) as SignoffRow[];
  const managerIds = [...new Set(signoffs.map((row) => row.manager_id))];
  const [planNamesRes, certsRes, stepsRes, managersRes] = await Promise.all([
    plans.length ? db.from("onboarding_plans").select("id, name").in("id", [...new Set(plans.map((plan) => plan.plan_id))]) : { data: [] },
    // Certificates carry no reliable tenant of their own; they are reached through the tenant's plans.
    planIds.length
      ? db.from("segment_certificates").select("id, assignment_id, certificate_code, issued_at, expires_at").in("assignment_id", planIds)
      : { data: [] },
    planIds.length
      ? db.from("plan_assignment_steps").select("id, assignment_id, status, completed_at, notes, plan_steps(title, sort_order, metadata)").in("assignment_id", planIds)
      : { data: [] },
    managerIds.length ? db.from("profiles").select("id, full_name").in("id", managerIds) : { data: [] },
  ]);
  const planName = new Map(((planNamesRes.data ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name]));
  type CertRow = { id: string; assignment_id: string; certificate_code: string; issued_at: string; expires_at: string | null };
  const certOf = new Map(((certsRes.data ?? []) as CertRow[]).map((cert) => [cert.assignment_id, cert]));
  type StepRow = {
    id: string;
    assignment_id: string;
    status: string;
    completed_at: string | null;
    notes: string | null;
    plan_steps: { title: string; sort_order: number; metadata: unknown } | null;
  };
  const steps = (stepsRes.data ?? []) as unknown as StepRow[];
  const stepOf = new Map(steps.map((row) => [row.id, row]));
  const managerName = new Map(((managersRes.data ?? []) as { id: string; full_name: string }[]).map((row) => [row.id, row.full_name]));

  const finishedAt = (plan: PlanRow) => (plan.status === "completed" ? (certOf.get(plan.id)?.issued_at ?? plan.updated_at) : null);
  const window = onboardingWindow(plans.map((plan) => ({ startDate: plan.start_date, status: plan.status, finishedAt: finishedAt(plan) })));
  const stageName = (assignmentId: string) => {
    const plan = plans.find((row) => row.id === assignmentId);
    return (plan && planName.get(plan.plan_id)) || "Onboarding stage";
  };
  const isGateStep = (step: StepRow | undefined) => Boolean(asObject(step?.plan_steps?.metadata).isSegmentGate);
  const DONE = new Set(["completed", "reviewed"]);
  const entries: RecordEntry[] = [];

  for (const plan of plans) {
    const at = finishedAt(plan);
    if (!at || !inBounds(at, bounds)) continue;
    const cert = certOf.get(plan.id);
    const own = steps.filter((step) => step.assignment_id === plan.id).sort((a, b) => (a.plan_steps?.sort_order ?? 0) - (b.plan_steps?.sort_order ?? 0));
    const done = own.filter((step) => DONE.has(step.status));
    const gateSteps = own.filter((step) => isGateStep(step));
    const days = Math.max(1, Math.round((new Date(at).getTime() - new Date(`${plan.start_date}T12:00:00Z`).getTime()) / 86_400_000) + 1);
    const mentorNotes = (mentorRecords?.managerNotes ?? []).filter((note) => note.assignmentId === plan.id);
    entries.push({
      id: `stage:${plan.id}`,
      kind: "stage",
      at,
      title: stageName(plan.id),
      subtitle: cert ? `Certificate ${cert.certificate_code}` : `${done.length} of ${own.length} steps`,
      phase: "onboarding",
      headline: { value: "Complete", tone: "good" },
      scores: [],
      notes: notes(
        ...mentorNotes.flatMap((note) => [
          { label: "Mentor: strength", body: note.strength, author: note.authorName, at: note.createdAt, tone: "good" as const },
          { label: "Mentor: risk", body: note.risk, author: note.authorName, at: note.createdAt, tone: "warn" as const },
          { label: "Mentor: next action", body: note.action, author: note.authorName, at: note.createdAt },
        ]),
      ),
      facts: [
        { label: "Started", value: dayText(`${plan.start_date}T12:00:00Z`) },
        { label: "Finished", value: dayText(at) },
        { label: "Took", value: `${days} day${days === 1 ? "" : "s"}` },
        { label: "Steps", value: `${done.length} of ${own.length} done` },
        ...(cert ? [{ label: "Certificate", value: cert.certificate_code }] : []),
        ...(cert?.expires_at ? [{ label: "Valid to", value: dayText(cert.expires_at) }] : []),
      ],
      lists: [
        ...(gateSteps.length ? [{ label: "Gates", items: gateSteps.map((step) => step.plan_steps?.title ?? "Gate") }] : []),
        ...(own.length ? [{ label: "Steps", items: own.map((step) => `${DONE.has(step.status) ? "✓" : "–"} ${step.plan_steps?.title ?? "Step"}`) }] : []),
      ],
      texts: [],
      open: null,
    });
  }

  // ── Sign-offs, with what the mentor said about the same step ──────────────
  const REVIEW_LABEL: Record<string, string> = {
    certification: "Certification",
    challenge_submission: "Challenge",
    coaching_card: "Simulation card",
    deal_prep: "Deal prep",
    mentor_review: "Mentor review",
    pitch: "Pitch",
    plan_step: "Plan step",
  };
  const TIER_LABEL: Record<string, string> = { hard: "Observed live", standard: "Standard review", light: "Light review" };
  for (const row of signoffs) {
    const step = row.review_type === "plan_step" ? stepOf.get(row.review_target_id) : undefined;
    const gate = isGateStep(step);
    const author = managerName.get(row.manager_id) ?? "Manager";
    const recommendation = (mentorRecords?.gateRecommendations ?? []).find((item) => item.assignmentStepId === row.review_target_id);
    const feedback = (mentorRecords?.feedback ?? []).filter((item) => item.assignmentStepId === row.review_target_id);
    const approved = row.decision === "approve";
    entries.push({
      id: `gate:${row.id}`,
      kind: "gate",
      at: row.created_at,
      title: step?.plan_steps?.title ?? REVIEW_LABEL[row.review_type] ?? "Sign-off",
      subtitle: [gate ? "Stage gate" : REVIEW_LABEL[row.review_type], step ? stageName(step.assignment_id) : null].filter(Boolean).join(" · "),
      phase: phaseOf(row.created_at, window, row.review_type === "plan_step"),
      headline: approved ? { value: row.confidence ? `${row.confidence}/5` : "Signed", tone: "good" } : { value: "Sent back", tone: "bad" },
      scores: [],
      notes: notes(
        { label: "Strength", body: row.strength, author, at: row.created_at, tone: "good" },
        { label: "Gap", body: row.gap ?? "", author, at: row.created_at, tone: "warn" },
        { label: "Next action", body: row.next_action, author, at: row.created_at },
        { label: "Live attestation", body: row.attestation_note ?? "", author, at: row.created_at },
        recommendation && {
          label: recommendation.recommendation === "ready" ? "Mentor: ready" : "Mentor: not yet",
          body: recommendation.rationale,
          author: recommendation.authorName,
          at: recommendation.createdAt,
          tone: recommendation.recommendation === "ready" ? "good" : "warn",
        },
        ...feedback.map((item) => ({ label: "Mentor feedback", body: item.body, author: item.authorName, at: item.createdAt })),
        { label: "Their note", body: step?.notes ?? "", author: personName },
      ),
      facts: [
        { label: "Decision", value: approved ? "Signed off" : "Sent back" },
        ...(row.confidence ? [{ label: "Confidence", value: `${row.confidence} of 5` }] : []),
        { label: "Review", value: TIER_LABEL[row.signoff_tier] ?? row.signoff_tier },
        { label: "By", value: author },
      ],
      lists: [],
      texts: [],
      open: null,
    });
  }

  // ── Assigned work finished in the period ──────────────────────────────────
  type DrillRow = {
    id: string;
    playbook_id: string;
    kind: string;
    score: number | null;
    scenario_id: string | null;
    simulation_assignment_id: string | null;
    response_text: string | null;
    feedback: unknown;
    created_at: string;
  };
  const drills = ((drillsRes.data ?? []) as DrillRow[]).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const playbookById = new Map<string, PlaybookAssignment>(playbookAssignments.map((assignment) => [assignment.playbookId, assignment]));
  // The assignment's evidence (answers, drill transcripts) opens over the Record for managers.
  const openWork = (id: string | undefined, kind: "playbook" | "quiz"): RecordEntry["open"] =>
    viewer === "manager" && id ? { workId: id, workKind: kind, label: kind === "playbook" ? "See their answers and drills" : "See their answers" } : null;

  for (const assignment of playbookAssignments) {
    if (assignment.status !== "completed" || !assignment.completedAt || !inBounds(assignment.completedAt, bounds)) continue;
    const own = drills.filter((drill) => drill.playbook_id === assignment.playbookId);
    const latestPitch = own.filter((drill) => drill.kind === "pitch").at(-1);
    const coaching = latestPitch ? drillNotes(latestPitch.feedback, latestPitch.created_at) : null;
    const scores = assignment.progress.parts
      .filter((part) => part.key !== "read")
      .map((part) => ({ label: part.label.replace(/,.*$/, ""), score: typeof part.score === "number" ? part.score : null, pass: part.pass ?? null }));
    const margins = scores.filter((score) => score.score !== null && score.pass !== null).map((score) => score.score! - score.pass!);
    entries.push({
      id: `work:${assignment.id}`,
      kind: "work",
      at: assignment.completedAt,
      title: `Ch. ${assignment.chapter} ${assignment.playbookTitle}`,
      subtitle: "Playbook assignment",
      phase: phaseOf(assignment.completedAt, window),
      headline: { value: "Passed", tone: margins.length && Math.min(...margins) <= 5 ? "warn" : "good" },
      scores,
      notes: notes(
        { label: "Note when assigned", body: assignment.note ?? "", author: assignment.assignedByName ?? undefined, at: assignment.createdAt },
        ...(coaching?.notes ?? []),
      ),
      facts: [
        { label: "Assigned", value: dayText(assignment.createdAt) },
        { label: "Due", value: dayText(`${assignment.dueDate}T12:00:00Z`) },
        { label: "Finished", value: dayText(assignment.completedAt) },
        ...(assignment.assignedByName ? [{ label: "Assigned by", value: assignment.assignedByName }] : []),
      ],
      lists: coaching?.lists ?? [],
      texts: latestPitch?.response_text ? [{ label: "Their pitch", body: latestPitch.response_text }] : [],
      open: openWork(assignment.id, "playbook"),
    });
  }

  const completedAt = new Map<string, string>();
  for (const res of [quizRes, pitchAssignRes, contentRes]) {
    for (const row of (res.data ?? []) as { id: string; completed_at: string }[]) completedAt.set(row.id, row.completed_at);
  }
  type SimRow = { id: string; assigned_by: string | null; template_id: string | null; persona: string; solution_focus: string; status: string; updated_at: string };
  const simsDone = (simsRes.data ?? []) as SimRow[];
  for (const sim of simsDone) if (sim.assigned_by && sim.assigned_by !== userId) completedAt.set(sim.id, sim.updated_at);
  for (const item of assignedWork) {
    const at = completedAt.get(item.id);
    if (item.kind === "playbook" || item.state !== "done" || !at) continue;
    entries.push({
      id: `work:${item.id}`,
      kind: "work",
      at,
      title: item.title,
      subtitle: item.detail,
      phase: phaseOf(at, window),
      headline: { value: "Done", tone: "good" },
      scores: [],
      notes: notes({ label: "Note when assigned", body: item.note ?? "" }),
      facts: [
        { label: "Assigned", value: dayText(item.createdAt) },
        ...(item.dueDate ? [{ label: "Due", value: dayText(`${item.dueDate}T12:00:00Z`) }] : []),
        { label: "Finished", value: dayText(at) },
      ],
      lists: [],
      texts: [],
      open: item.kind === "quiz" ? openWork(item.id, "quiz") : null,
    });
  }

  // ── Practice ──────────────────────────────────────────────────────────────
  type AttemptRow = { question_id: string; quiz_id: string; correct: boolean; created_at: string };
  const attempts = (attemptsRes.data ?? []) as AttemptRow[];
  const questionIds = [...new Set(attempts.map((row) => row.question_id))];
  const { data: questionRows } = questionIds.length
    ? await db.from("question_bank").select("id, source_kind, playbook_id, topic").in("id", questionIds)
    : { data: [] };
  const questions = (questionRows ?? []) as { id: string; source_kind: string; playbook_id: string | null; topic: string }[];
  const playbookIds = [...new Set([...drills.map((row) => row.playbook_id), ...questions.map((row) => row.playbook_id)].filter((id): id is string => Boolean(id)))];
  const templateIds = [...new Set(simsDone.map((row) => row.template_id).filter((id): id is string => Boolean(id)))];
  const [playbooksRes, templatesRes] = await Promise.all([
    playbookIds.length ? db.from("capability_playbooks").select("id, title, chapter").in("id", playbookIds) : { data: [] },
    templateIds.length ? db.from("simulation_templates").select("id, name").in("id", templateIds) : { data: [] },
  ]);
  const playbookTitle = new Map(
    ((playbooksRes.data ?? []) as { id: string; title: string; chapter: number }[]).map((row) => [row.id, `Ch. ${row.chapter} ${row.title}`]),
  );
  const templateName = new Map(((templatesRes.data ?? []) as { id: string; name: string }[]).map((row) => [row.id, row.name]));
  // A drill or check on an assigned chapter opens that assignment, where the answers can be read.
  const practiceOpen = (playbookId: string | null | undefined) => openWork(playbookId ? playbookById.get(playbookId)?.id : undefined, "playbook");

  type CardRow = {
    id: string;
    simulation_assignment_id: string | null;
    structured_output: unknown;
    is_practice: boolean;
    manager_comments: string | null;
    manager_grade: number | null;
    manager_review_status: string;
    se_reflection: string | null;
    created_at: string;
  };
  const simsWithScore = new Set<string>();
  for (const card of (cardsRes.data ?? []) as CardRow[]) {
    const output = asObject(card.structured_output);
    const context = asObject(output.simulationContext);
    const score = typeof output.score === "number" ? output.score : null;
    if (card.simulation_assignment_id) simsWithScore.add(card.simulation_assignment_id);
    entries.push({
      id: `simulation:${card.id}`,
      kind: "simulation",
      at: card.created_at,
      title: text(context.persona) || "Simulation",
      subtitle: card.is_practice ? "Practice run" : `Scored run, ${card.manager_review_status.replaceAll("_", " ")}`,
      phase: phaseOf(card.created_at, window),
      headline: scoreHeadline(score),
      scores: [{ label: "Overall", score, pass: null }, ...(card.manager_grade !== null ? [{ label: "Manager grade", score: card.manager_grade, pass: null }] : [])],
      notes: notes(
        { label: "Manager comments", body: card.manager_comments ?? "" },
        { label: "Summary", body: text(output.managerSummary ?? output.manager_summary), author: "AI coach" },
        { label: "Their reflection", body: card.se_reflection ?? "", author: personName },
      ),
      facts: [],
      lists: [
        { label: "Strengths", items: strings(output.strengths) },
        { label: "Gaps", items: strings(output.gaps) },
        { label: "Improve next", items: strings(output.recommendedImprovements ?? output.recommended_improvements) },
      ].filter((list) => list.items.length),
      texts: [],
      open: null,
    });
  }
  for (const drill of drills.filter((row) => row.kind === "objections")) {
    if (drill.simulation_assignment_id && simsWithScore.has(drill.simulation_assignment_id)) continue;
    if (drill.simulation_assignment_id) simsWithScore.add(drill.simulation_assignment_id);
    const coaching = drillNotes(drill.feedback, drill.created_at);
    entries.push({
      id: `simulation:${drill.id}`,
      kind: "simulation",
      at: drill.created_at,
      title: `Objection drill, ${playbookTitle.get(drill.playbook_id) ?? "playbook"}`,
      subtitle: playbookById.has(drill.playbook_id) ? "Playbook drill, assigned" : "Playbook drill",
      phase: phaseOf(drill.created_at, window),
      headline: scoreHeadline(drill.score),
      scores: [{ label: "Overall", score: drill.score, pass: null }, ...coaching.scores],
      notes: coaching.notes,
      facts: [],
      lists: coaching.lists,
      texts: drill.response_text ? [{ label: "What they said", body: drill.response_text }] : [],
      open: practiceOpen(drill.playbook_id),
    });
  }
  for (const sim of simsDone) {
    // A run already scored by its coaching card or objection drill is the same attempt.
    if (simsWithScore.has(sim.id)) continue;
    entries.push({
      id: `simulation:${sim.id}`,
      kind: "simulation",
      at: sim.updated_at,
      title: (sim.template_id && templateName.get(sim.template_id)) || sim.persona,
      subtitle: `${sim.solution_focus}, not scored`,
      phase: phaseOf(sim.updated_at, window),
      headline: null,
      scores: [{ label: "Overall", score: null, pass: null }],
      notes: [],
      facts: [],
      lists: [],
      texts: [],
      open: null,
    });
  }

  const pitchDrills = drills.filter((row) => row.kind === "pitch");
  for (const drill of pitchDrills) {
    const coaching = drillNotes(drill.feedback, drill.created_at);
    const assignment = playbookById.get(drill.playbook_id);
    const pass = assignment?.requirePitch ? assignment.pitchPassScore : null;
    entries.push({
      id: `pitch:${drill.id}`,
      kind: "pitch",
      at: drill.created_at,
      title: `Pitch drill, ${playbookTitle.get(drill.playbook_id) ?? "playbook"}`,
      subtitle: assignment ? "Playbook drill, assigned" : "Playbook drill",
      phase: phaseOf(drill.created_at, window),
      headline: scoreHeadline(drill.score, pass),
      scores: [{ label: "Overall", score: drill.score, pass }, ...coaching.scores],
      notes: coaching.notes,
      facts: [],
      lists: coaching.lists,
      texts: drill.response_text ? [{ label: "What they said", body: drill.response_text }] : [],
      open: practiceOpen(drill.playbook_id),
    });
  }
  type PitchSessionRow = { id: string; title: string; scenario_id: string | null; ai_scores: unknown; reflection_text: string | null; created_at: string };
  for (const session of (pitchSessionsRes.data ?? []) as PitchSessionRow[]) {
    // Saving a drill's pitch to Pitch Studio is the same attempt, not a second one.
    const duplicate = pitchDrills.some(
      (drill) => drill.scenario_id === session.scenario_id && Math.abs(new Date(drill.created_at).getTime() - new Date(session.created_at).getTime()) < 10 * 60_000,
    );
    if (duplicate) continue;
    const scores = rubric(session.ai_scores);
    const overall = averageOf(scores);
    entries.push({
      id: `pitch:${session.id}`,
      kind: "pitch",
      at: session.created_at,
      title: session.title,
      subtitle: "Pitch Studio practice",
      phase: phaseOf(session.created_at, window),
      headline: scoreHeadline(overall),
      scores: [{ label: "Overall", score: overall, pass: null }, ...scores],
      notes: notes({ label: "Their reflection", body: session.reflection_text ?? "", author: personName }),
      facts: [],
      lists: [],
      texts: [],
      open: null,
    });
  }
  type PitchSubRow = { id: string; title: string; status: string; manager_grade: number | null; manager_feedback: string | null; reflection_text: string | null; created_at: string };
  for (const submission of (pitchSubsRes.data ?? []) as PitchSubRow[]) {
    entries.push({
      id: `pitch:${submission.id}`,
      kind: "pitch",
      at: submission.created_at,
      title: submission.title,
      subtitle: `Submitted for review, ${submission.status.replaceAll("_", " ")}`,
      phase: phaseOf(submission.created_at, window),
      headline: scoreHeadline(submission.manager_grade),
      scores: [{ label: "Manager grade", score: submission.manager_grade, pass: null }],
      notes: notes(
        { label: "Manager feedback", body: submission.manager_feedback ?? "" },
        { label: "Their reflection", body: submission.reflection_text ?? "", author: personName },
      ),
      facts: [],
      lists: [],
      texts: [],
      open: null,
    });
  }

  const questionOf = new Map(questions.map((row) => [row.id, row]));
  for (const sitting of quizAttemptScores(attempts)) {
    const answers = attempts.filter((row) => row.quiz_id === sitting.quizId);
    const question = questionOf.get(answers[0]!.question_id);
    const playbookId = question?.source_kind === "playbook" ? question.playbook_id : null;
    const assignment = playbookId ? playbookById.get(playbookId) : undefined;
    const pass = assignment?.requireQuiz ? assignment.quizPassScore : null;
    const right = answers.filter((row) => row.correct).length;
    entries.push({
      id: `check:${sitting.quizId}`,
      kind: "check",
      at: sitting.at,
      title: playbookId ? (playbookTitle.get(playbookId) ?? "Playbook knowledge check") : question?.topic || "Knowledge check",
      subtitle: `${right} of ${answers.length} right${assignment ? ", assigned" : ""}`,
      phase: phaseOf(sitting.at, window),
      headline: scoreHeadline(sitting.score, pass),
      scores: [{ label: "Score", score: sitting.score, pass }],
      notes: [],
      facts: [{ label: "Answers", value: `${right} of ${answers.length} right` }],
      lists: [],
      texts: [],
      open: practiceOpen(playbookId),
    });
  }

  // ── 1:1s, mentor check-ins and coaching notes ─────────────────────────────
  for (const event of (oneOnOnesRes.data ?? []) as { id: string; title: string; metadata: unknown; created_at: string }[]) {
    const meta = asObject(event.metadata);
    const start = text(meta.start);
    const minutes = typeof meta.minutes === "number" ? meta.minutes : 30;
    // Held means it has finished; a 1:1 still ahead isn't something they did yet.
    if (!start || !inBounds(start, bounds) || new Date(start).getTime() + minutes * 60_000 > now.getTime()) continue;
    entries.push({
      id: `one_on_one:${event.id}`,
      kind: "one_on_one",
      at: start,
      title: event.title,
      subtitle: `${minutes} min${meta.mentor_invited ? ", mentor joined" : ""}`,
      phase: phaseOf(start, window),
      headline: null,
      scores: [],
      notes: [],
      facts: [
        { label: "When", value: text(meta.label) || dayText(start) },
        { label: "Length", value: `${minutes} min` },
        ...(text(meta.scheduled_by_name) ? [{ label: "Scheduled by", value: text(meta.scheduled_by_name) }] : []),
      ],
      lists: [],
      texts: [],
      open: null,
    });
  }
  for (const checkin of mentorRecords?.checkins ?? []) {
    if (!inBounds(checkin.createdAt, bounds)) continue;
    entries.push({
      id: `mentor:${checkin.id}`,
      kind: "mentor",
      at: checkin.createdAt,
      title: `Mentor 1:1, ${dayText(`${checkin.metOn}T12:00:00Z`)}`,
      subtitle: checkin.assignmentId ? stageName(checkin.assignmentId) : "Mentor check-in",
      phase: phaseOf(checkin.createdAt, window, Boolean(checkin.assignmentId)),
      headline: null,
      scores: [],
      notes: notes({ label: "Notes", body: checkin.notes }, { label: "Next actions", body: checkin.nextActions }),
      facts: [],
      lists: checkin.agenda.length ? [{ label: "Agenda", items: checkin.agenda }] : [],
      texts: [],
      open: null,
    });
  }
  for (const note of (sessionNotesRes.data ?? []) as { id: string; session_focus: string; note: string; outcome_label: string; created_at: string }[]) {
    entries.push({
      id: `coaching:${note.id}`,
      kind: "coaching",
      at: note.created_at,
      title: note.session_focus || "Coaching session",
      subtitle: note.outcome_label.replaceAll("_", " "),
      phase: phaseOf(note.created_at, window),
      headline: null,
      scores: [],
      notes: notes({ label: "Your note", body: note.note }),
      facts: [],
      lists: [],
      texts: [],
      open: null,
    });
  }

  const kept = entries.filter((entry) => matchesPhase(entry, phase)).sort((a, b) => b.at.localeCompare(a.at));
  return {
    person: { id: person.id as string, name: personName },
    period,
    phase,
    onboarding: window,
    entries: kept,
    summary: summarizeRecord(kept),
  };
}
