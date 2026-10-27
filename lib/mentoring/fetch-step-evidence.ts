import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { StepEvidence } from "@/lib/mentoring/mentor-records-model";
import { quizAttemptScores } from "@/lib/question-bank/model";
import type { PlanStep } from "@/lib/types";

type Db = SupabaseClient<Database>;
type Loose = SupabaseClient;

const PITCH_SCENARIO = /[?&]scenario=([0-9a-f-]{36})/i;

function strings(value: unknown, limit = 6): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, limit) : [];
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function short(iso: string | null | undefined) {
  return iso ? iso.slice(0, 10) : undefined;
}

function transcriptLines(value: unknown): { speaker: string; message: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => record(item))
    .filter((item) => typeof item.message === "string")
    .map((item) => ({
      speaker: item.speaker === "se" ? "Mentee" : item.speaker === "coach" ? "Coach" : "Customer",
      message: item.message as string,
    }));
}

/** What one mentee has actually produced for each step, keyed by plan step id. */
export async function fetchStepEvidence(admin: Db, userId: string, steps: PlanStep[]): Promise<Record<string, StepEvidence[]>> {
  const loose = admin as unknown as Loose;
  const challengeIds = [...new Set(steps.map((step) => step.challengeId).filter((id): id is string => Boolean(id)))];
  const templateIds = [...new Set(steps.map((step) => step.simulationTemplateId).filter((id): id is string => Boolean(id)))];
  const playbookIds = [...new Set(steps.map((step) => step.playbookId).filter((id): id is string => Boolean(id)))];
  const checkSources = [...new Set(steps.map((step) => (step.type === "knowledge_check" ? step.questionSource : undefined)).filter((key): key is string => Boolean(key)))];
  const scenarioByStep = new Map<string, string>();
  for (const step of steps) {
    const match = step.resourceUrl ? PITCH_SCENARIO.exec(step.resourceUrl) : null;
    if (match) scenarioByStep.set(step.id, match[1]!);
  }
  const assignmentStepIds = steps.map((step) => step.assignmentStepId).filter((id): id is string => Boolean(id));

  const [challengeRows, simRows, readRows, attemptRows, pitchRows, shadowRows, mentorRows] = await Promise.all([
    challengeIds.length
      ? admin
          .from("challenge_submissions")
          .select("challenge_id, status, reflection_text, manager_grade, manager_feedback, ai_suggested_score, evidence_files, submitted_at, updated_at")
          .eq("user_id", userId)
          .in("challenge_id", challengeIds)
          .order("updated_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    templateIds.length
      ? admin
          .from("simulation_assignments")
          .select("id, template_id, status, transcript, updated_at")
          .eq("assigned_to", userId)
          .in("template_id", templateIds)
          .order("updated_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    playbookIds.length
      ? loose.from("playbook_reads").select("playbook_id, read_at").eq("user_id", userId).in("playbook_id", playbookIds)
      : Promise.resolve({ data: [] }),
    checkSources.length
      ? loose.from("question_attempts").select("question_id, quiz_id, correct, created_at").eq("user_id", userId).order("created_at", { ascending: true }).limit(2000)
      : Promise.resolve({ data: [] }),
    scenarioByStep.size
      ? admin
          .from("pitch_submissions")
          .select("scenario_id, status, manager_grade, manager_feedback, reflection_text, transcript, duration_sec, response_mode, created_at")
          .eq("user_id", userId)
          .in("scenario_id", [...new Set(scenarioByStep.values())])
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    assignmentStepIds.length
      ? admin.from("shadow_meeting_logs").select("assignment_step_id, meeting_date, customer_name, notes, takeaways").in("assignment_step_id", assignmentStepIds)
      : Promise.resolve({ data: [] }),
    assignmentStepIds.length
      ? admin.from("mentor_review_requests").select("assignment_step_id, topic, se_notes, mentor_feedback, status, created_at").in("assignment_step_id", assignmentStepIds)
      : Promise.resolve({ data: [] }),
  ]);

  const simAssignments = (simRows.data ?? []) as { id: string; template_id: string | null; status: string; transcript: unknown; updated_at: string }[];
  const { data: cardRows } = simAssignments.length
    ? await admin
        .from("coaching_cards")
        .select("simulation_assignment_id, structured_output, se_reflection, manager_review_status, manager_comments, is_practice, created_at")
        .in("simulation_assignment_id", simAssignments.map((row) => row.id))
        .order("created_at", { ascending: false })
    : { data: [] };

  const attempts = (attemptRows.data ?? []) as { question_id: string; quiz_id: string; correct: boolean; created_at: string }[];
  const questionIds = [...new Set(attempts.map((row) => row.question_id))];
  const { data: questionRows } = questionIds.length
    ? await loose.from("question_bank").select("id, source_kind, playbook_id, topic").in("id", questionIds)
    : { data: [] };
  const keyOfQuestion = new Map(
    ((questionRows ?? []) as { id: string; source_kind: string; playbook_id: string | null; topic: string }[]).map((row) => [
      row.id,
      row.source_kind === "playbook" ? `playbook:${row.playbook_id}` : `${row.source_kind}:${row.topic.trim().toLowerCase()}`,
    ]),
  );

  const evidence: Record<string, StepEvidence[]> = {};
  const add = (stepId: string, item: StepEvidence) => {
    (evidence[stepId] ??= []).push(item);
  };

  for (const step of steps) {
    if (step.challengeId) {
      for (const row of ((challengeRows.data ?? []) as Record<string, unknown>[]).filter((item) => item.challenge_id === step.challengeId).slice(0, 2)) {
        const facts = [{ label: "Status", value: String(row.status).replaceAll("_", " ") }];
        if (typeof row.manager_grade === "number") facts.push({ label: "Manager grade", value: `${row.manager_grade} of 5` });
        if (typeof row.ai_suggested_score === "number") facts.push({ label: "AI suggested score", value: String(row.ai_suggested_score) });
        const files = strings(row.evidence_files, 20).length;
        if (files) facts.push({ label: "Evidence files", value: String(files) });
        add(step.id, {
          label: "Challenge submission",
          at: short((row.submitted_at as string | null) ?? (row.updated_at as string)),
          facts,
          lists: [],
          texts: [
            ...(typeof row.reflection_text === "string" && row.reflection_text ? [{ label: "Their write-up", body: row.reflection_text }] : []),
            ...(typeof row.manager_feedback === "string" && row.manager_feedback ? [{ label: "Manager feedback", body: row.manager_feedback }] : []),
          ],
        });
      }
    }

    if (step.simulationTemplateId) {
      const runs = simAssignments.filter((row) => row.template_id === step.simulationTemplateId).slice(0, 2);
      for (const run of runs) {
        const card = ((cardRows ?? []) as Record<string, unknown>[]).find((row) => row.simulation_assignment_id === run.id);
        const output = record(card?.structured_output);
        const facts = [{ label: "Status", value: run.status.replaceAll("_", " ") }];
        if (typeof output.score === "number") facts.push({ label: "Score", value: `${output.score}` });
        if (card) facts.push({ label: "Review", value: card.is_practice ? "Practice round" : String(card.manager_review_status).replaceAll("_", " ") });
        const transcript = transcriptLines(run.transcript);
        add(step.id, {
          label: card ? "Simulation result" : "Simulation in progress",
          at: short(run.updated_at),
          facts,
          lists: [
            { label: "Strengths", items: strings(output.strengths) },
            { label: "Gaps", items: strings(output.gaps) },
            { label: "Suggested improvements", items: strings(output.recommendedImprovements ?? output.recommended_improvements) },
          ].filter((item) => item.items.length > 0),
          texts: [
            ...(typeof output.managerSummary === "string" && output.managerSummary ? [{ label: "Coach summary", body: output.managerSummary }] : []),
            ...(typeof card?.se_reflection === "string" && card.se_reflection ? [{ label: "Their reflection", body: card.se_reflection }] : []),
            ...(typeof card?.manager_comments === "string" && card.manager_comments ? [{ label: "Manager comments", body: card.manager_comments }] : []),
          ],
          transcript: transcript.length ? transcript : undefined,
        });
      }
    }

    if (step.playbookId) {
      const read = ((readRows.data ?? []) as { playbook_id: string; read_at: string }[]).find((row) => row.playbook_id === step.playbookId);
      if (read) add(step.id, { label: "Playbook read", at: short(read.read_at), facts: [{ label: "Finished reading", value: short(read.read_at) ?? "" }], lists: [], texts: [] });
    }

    if (step.type === "knowledge_check" && step.questionSource) {
      const sittings = quizAttemptScores(attempts.filter((row) => keyOfQuestion.get(row.question_id) === step.questionSource));
      if (sittings.length) {
        const best = Math.max(...sittings.map((item) => item.score));
        add(step.id, {
          label: "Knowledge check attempts",
          at: short(sittings[sittings.length - 1]!.at),
          facts: [
            { label: "Best score", value: `${best}%${step.passScore ? ` (pass ${step.passScore}%)` : ""}` },
            { label: "Attempts", value: String(sittings.length) },
          ],
          lists: [{ label: "Each attempt", items: sittings.map((item) => `${short(item.at)}: ${item.score}%`) }],
          texts: [],
        });
      }
    }

    const scenario = scenarioByStep.get(step.id);
    if (scenario) {
      for (const row of ((pitchRows.data ?? []) as Record<string, unknown>[]).filter((item) => item.scenario_id === scenario).slice(0, 2)) {
        const facts = [
          { label: "Status", value: String(row.status).replaceAll("_", " ") },
          { label: "Format", value: String(row.response_mode) },
        ];
        if (typeof row.duration_sec === "number") facts.push({ label: "Length", value: `${Math.round(row.duration_sec)} seconds` });
        if (typeof row.manager_grade === "number") facts.push({ label: "Manager grade", value: `${row.manager_grade} of 5` });
        add(step.id, {
          label: "Pitch submission",
          at: short(row.created_at as string),
          facts,
          lists: [],
          texts: [
            ...(typeof row.transcript === "string" && row.transcript ? [{ label: "What they said", body: row.transcript }] : []),
            ...(typeof row.reflection_text === "string" && row.reflection_text ? [{ label: "Their reflection", body: row.reflection_text }] : []),
            ...(typeof row.manager_feedback === "string" && row.manager_feedback ? [{ label: "Manager feedback", body: row.manager_feedback }] : []),
          ],
        });
      }
    }

    if (step.assignmentStepId) {
      for (const row of ((shadowRows.data ?? []) as Record<string, unknown>[]).filter((item) => item.assignment_step_id === step.assignmentStepId)) {
        add(step.id, {
          label: "Shadow call log",
          at: short(row.meeting_date as string),
          facts: typeof row.customer_name === "string" && row.customer_name ? [{ label: "Customer", value: row.customer_name }] : [],
          lists: [],
          texts: [
            { label: "Notes", body: String(row.notes ?? "") },
            ...(typeof row.takeaways === "string" && row.takeaways ? [{ label: "Takeaways", body: row.takeaways }] : []),
          ],
        });
      }
      for (const row of ((mentorRows.data ?? []) as Record<string, unknown>[]).filter((item) => item.assignment_step_id === step.assignmentStepId)) {
        add(step.id, {
          label: "Check-in request",
          at: short(row.created_at as string),
          facts: [{ label: "Status", value: String(row.status) }],
          lists: [],
          texts: [
            { label: "Topic", body: String(row.topic ?? "") },
            ...(typeof row.se_notes === "string" && row.se_notes ? [{ label: "Their notes", body: row.se_notes }] : []),
            ...(typeof row.mentor_feedback === "string" && row.mentor_feedback ? [{ label: "Your feedback", body: row.mentor_feedback }] : []),
          ],
        });
      }
    }
  }

  return evidence;
}
