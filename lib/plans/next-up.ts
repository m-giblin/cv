import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchPlansForUsers } from "@/lib/data/fetch-plans-bundle";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import type { Database } from "@/lib/database.types";
import type { PlanStep, UserPlan } from "@/lib/types";
import { planStepActionLabel, planStepHref } from "@/lib/utils/plan-links";

/** What to offer once a step is done: the next thing on the same plan. */
export type NextUpStep = {
  title: string;
  type: PlanStep["type"];
  href: string;
  /** The yes button: "Take the quiz", "Read it now". */
  label: string;
  /** Knowledge checks only: the question bank to open, and the pass mark. */
  questionSource?: string;
  passScore?: number;
};

const DONE_OR_WITH_REVIEWER = new Set<PlanStep["status"]>(["completed", "reviewed", "submitted", "under_review"]);

function nextUpLabel(step: PlanStep) {
  if (step.type === "knowledge_check") return "Take the quiz";
  if (step.type === "playbook") return "Read it now";
  return planStepActionLabel(step);
}

/**
 * The next open, unlocked step after the one just finished, on the plan that holds it (the current
 * plan first, as plans come current-first). Reading ahead in a later month points at that month's
 * next step.
 */
export function pickNextUpStep(plans: UserPlan[], finishedPlanStepIds: string[]): NextUpStep | null {
  const finished = new Set(finishedPlanStepIds);
  const plan = plans.find((item) => item.steps.some((step) => finished.has(step.id)));
  if (!plan) return null;
  const steps = [...plan.steps].sort((a, b) => a.order - b.order);
  const open = steps.filter((item) => !finished.has(item.id) && !DONE_OR_WITH_REVIEWER.has(item.status) && !item.locked);
  const lastFinished = Math.max(...steps.filter((item) => finished.has(item.id)).map((item) => item.order));
  // The next open step after the one just done; if everything after it is done, the earliest one left.
  const step = open.find((item) => item.order > lastFinished) ?? open[0];
  if (!step) return null;
  return {
    title: step.title,
    type: step.type,
    href: planStepHref(step),
    label: nextUpLabel(step),
    questionSource: step.type === "knowledge_check" ? step.questionSource : undefined,
    passScore: step.type === "knowledge_check" ? step.passScore : undefined,
  };
}

export async function fetchNextUpStep(input: { tenantId?: string | null; userId: string; finishedPlanStepIds: string[] }) {
  if (!input.finishedPlanStepIds.length) return null;
  const admin = getTenantAdminClient() as unknown as SupabaseClient<Database> | null;
  if (!admin) return null;
  const plans = await fetchPlansForUsers(admin, [input.userId], input.tenantId ?? null);
  return pickNextUpStep(plans, input.finishedPlanStepIds);
}

/**
 * The next step after one the person just submitted, from its assignment step id. Ad-hoc steps carry
 * their "adhoc-" id on the plan too, so they're matched as they are. Never throws: a missing offer
 * just means the old behaviour.
 */
export async function nextUpAfterSubmit(input: { userId: string; assignmentStepId?: string | null; planStepId?: string | null }) {
  try {
    let planStepId = input.planStepId ?? null;
    if (!planStepId && input.assignmentStepId) {
      if (input.assignmentStepId.startsWith("adhoc-")) {
        planStepId = input.assignmentStepId;
      } else {
        const admin = getTenantAdminClient() as unknown as SupabaseClient<Database> | null;
        const { data } = admin
          ? await admin.from("plan_assignment_steps").select("plan_step_id").eq("id", input.assignmentStepId).maybeSingle()
          : { data: null };
        planStepId = data?.plan_step_id ?? null;
      }
    }
    return planStepId ? await fetchNextUpStep({ userId: input.userId, finishedPlanStepIds: [planStepId] }) : null;
  } catch {
    return null;
  }
}
