import type { SupabaseClient } from "@supabase/supabase-js";
import { differenceInCalendarDays } from "date-fns";
import type { Database } from "@/lib/database.types";
import { buildManagerReviewReminderEmail } from "@/lib/email/manager-review-reminder-email";
import { sendResendEmail } from "@/lib/email/send-resend-email";
import { createNotification } from "@/lib/notifications/create-notification";
import {
  REVIEW_REMINDER_COOLDOWN_DAYS,
  REVIEW_REMINDER_MIN_PENDING_DAYS,
  type ReviewReminderKind,
  type ReviewReminderSource,
} from "@/lib/reviews/reminder-config";

export type ReviewReminderTarget = {
  kind: ReviewReminderKind;
  reviewId: string;
  seUserId: string;
  seName: string;
  managerId: string;
  managerName: string;
  managerEmail: string;
  title: string;
  submittedAt: string;
  tenantId: string | null;
};

export type ReminderEligibility = {
  canSend: boolean;
  pendingDays: number;
  lastReminderAt: string | null;
  nextReminderAt: string | null;
  reason?: string;
};

export function pendingDaysSince(submittedAt: string, now = new Date()) {
  return Math.max(0, differenceInCalendarDays(now, new Date(submittedAt)));
}

export function computeReminderEligibility(
  submittedAt: string,
  lastReminderAt: string | null,
  now = new Date(),
): ReminderEligibility {
  const pendingDays = pendingDaysSince(submittedAt, now);

  if (pendingDays < REVIEW_REMINDER_MIN_PENDING_DAYS) {
    const eligibleAt = new Date(submittedAt);
    eligibleAt.setDate(eligibleAt.getDate() + REVIEW_REMINDER_MIN_PENDING_DAYS);
    return {
      canSend: false,
      pendingDays,
      lastReminderAt,
      nextReminderAt: eligibleAt.toISOString(),
      reason: `Available after ${REVIEW_REMINDER_MIN_PENDING_DAYS} days pending`,
    };
  }

  if (lastReminderAt) {
    const last = new Date(lastReminderAt);
    const cooldownEnds = new Date(last);
    cooldownEnds.setDate(cooldownEnds.getDate() + REVIEW_REMINDER_COOLDOWN_DAYS);
    if (cooldownEnds > now) {
      return {
        canSend: false,
        pendingDays,
        lastReminderAt,
        nextReminderAt: cooldownEnds.toISOString(),
        reason: `Reminder sent recently — try again ${cooldownEnds.toLocaleDateString()}`,
      };
    }
  }

  return {
    canSend: true,
    pendingDays,
    lastReminderAt,
    nextReminderAt: null,
  };
}

export async function getLastReminderAt(
  supabase: SupabaseClient<Database>,
  kind: ReviewReminderKind,
  reviewId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("review_reminder_log")
    .select("created_at")
    .eq("review_kind", kind)
    .eq("review_id", reviewId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.created_at ?? null;
}

export async function sendReviewReminder(
  supabase: SupabaseClient<Database>,
  target: ReviewReminderTarget,
  source: ReviewReminderSource,
): Promise<{ ok: true } | { ok: false; reason: string; eligibility: ReminderEligibility }> {
  const lastReminderAt = await getLastReminderAt(supabase, target.kind, target.reviewId);
  const eligibility = computeReminderEligibility(target.submittedAt, lastReminderAt);

  if (!eligibility.canSend) {
    return { ok: false, reason: eligibility.reason ?? "Reminder not available yet", eligibility };
  }

  const triggerLabel = source === "se_nudge" ? "nudge from your SE" : "automatic reminder";
  const email = buildManagerReviewReminderEmail({
    managerName: target.managerName,
    seName: target.seName,
    itemTitle: target.title,
    itemKind: target.kind,
    pendingDays: eligibility.pendingDays,
    triggerLabel,
  });

  const emailResult = await sendResendEmail({
    to: target.managerEmail,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });

  if (!emailResult.sent) {
    return {
      ok: false,
      reason: emailResult.error ?? "Email could not be sent",
      eligibility,
    };
  }

  await createNotification(supabase, {
    userId: target.managerId,
    title: source === "se_nudge" ? `${target.seName} nudged you for a review` : "Review reminder",
    body: `${target.title} has been pending for ${eligibility.pendingDays} days.`,
    actionUrl: "/manager?section=inbox",
  });

  await supabase.from("review_reminder_log").insert({
    tenant_id: target.tenantId,
    review_kind: target.kind,
    review_id: target.reviewId,
    manager_id: target.managerId,
    se_user_id: target.seUserId,
    trigger_source: source,
  });

  return { ok: true };
}

export async function loadChallengeReminderTarget(
  supabase: SupabaseClient<Database>,
  submissionId: string,
): Promise<ReviewReminderTarget | null> {
  const { data: submission } = await supabase
    .from("challenge_submissions")
    .select("id, user_id, challenge_id, status, submitted_at, tenant_id")
    .eq("id", submissionId)
    .maybeSingle();

  if (!submission?.submitted_at) return null;
  if (submission.status !== "submitted" && submission.status !== "under_review") return null;

  const [{ data: se }, { data: challenge }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, manager_id, tenant_id")
      .eq("id", submission.user_id)
      .maybeSingle(),
    supabase.from("challenges").select("title").eq("id", submission.challenge_id).maybeSingle(),
  ]);

  if (!se?.manager_id) return null;

  const { data: manager } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", se.manager_id)
    .maybeSingle();

  if (!manager?.email) return null;

  return {
    kind: "challenge",
    reviewId: submission.id,
    seUserId: se.id,
    seName: se.full_name,
    managerId: manager.id,
    managerName: manager.full_name,
    managerEmail: manager.email,
    title: challenge?.title ?? "Challenge submission",
    submittedAt: submission.submitted_at,
    tenantId: submission.tenant_id ?? se.tenant_id ?? null,
  };
}

export async function loadCoachingReminderTarget(
  supabase: SupabaseClient<Database>,
  cardId: string,
): Promise<ReviewReminderTarget | null> {
  const { data: card } = await supabase
    .from("coaching_cards")
    .select("id, user_id, manager_review_status, sent_to_manager_at, created_at, tenant_id, is_practice, structured_output")
    .eq("id", cardId)
    .maybeSingle();

  if (!card || card.manager_review_status !== "pending" || card.is_practice) return null;

  const submittedAt = card.sent_to_manager_at ?? card.created_at;
  if (!submittedAt) return null;

  const { data: se } = await supabase
    .from("profiles")
    .select("id, full_name, email, manager_id, tenant_id")
    .eq("id", card.user_id)
    .maybeSingle();

  if (!se?.manager_id) return null;

  const { data: manager } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", se.manager_id)
    .maybeSingle();

  if (!manager?.email) return null;

  const structured = card.structured_output as { persona?: string } | null;
  const title = structured?.persona ?? "Simulation coaching card";

  return {
    kind: "coaching",
    reviewId: card.id,
    seUserId: se.id,
    seName: se.full_name,
    managerId: manager.id,
    managerName: manager.full_name,
    managerEmail: manager.email,
    title,
    submittedAt,
    tenantId: card.tenant_id ?? se.tenant_id ?? null,
  };
}
