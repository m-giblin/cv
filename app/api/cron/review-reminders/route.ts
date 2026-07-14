import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  computeReminderEligibility,
  getLastReminderAt,
  loadChallengeReminderTarget,
  loadCoachingReminderTarget,
  sendReviewReminder,
} from "@/lib/reviews/review-reminder-service";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Service role not configured" }, { status: 503 });
  }

  const [{ data: submissions }, { data: cards }] = await Promise.all([
    admin
      .from("challenge_submissions")
      .select("id")
      .in("status", ["submitted", "under_review"])
      .not("submitted_at", "is", null),
    admin
      .from("coaching_cards")
      .select("id")
      .eq("manager_review_status", "pending")
      .eq("is_practice", false),
  ]);

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of submissions ?? []) {
    const target = await loadChallengeReminderTarget(admin, row.id);
    if (!target) {
      skipped += 1;
      continue;
    }

    const lastReminderAt = await getLastReminderAt(admin, "challenge", row.id);
    const eligibility = computeReminderEligibility(target.submittedAt, lastReminderAt);
    if (!eligibility.canSend) {
      skipped += 1;
      continue;
    }

    const result = await sendReviewReminder(admin, target, "auto");
    if (result.ok) sent += 1;
    else failed += 1;
  }

  for (const row of cards ?? []) {
    const target = await loadCoachingReminderTarget(admin, row.id);
    if (!target) {
      skipped += 1;
      continue;
    }

    const lastReminderAt = await getLastReminderAt(admin, "coaching", row.id);
    const eligibility = computeReminderEligibility(target.submittedAt, lastReminderAt);
    if (!eligibility.canSend) {
      skipped += 1;
      continue;
    }

    const result = await sendReviewReminder(admin, target, "auto");
    if (result.ok) sent += 1;
    else failed += 1;
  }

  return NextResponse.json({ sent, skipped, failed });
}
