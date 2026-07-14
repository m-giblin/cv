import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  computeReminderEligibility,
  getLastReminderAt,
  loadChallengeReminderTarget,
  loadCoachingReminderTarget,
  sendReviewReminder,
} from "@/lib/reviews/review-reminder-service";
import type { ReviewReminderKind } from "@/lib/reviews/reminder-config";

const bodySchema = z.object({
  kind: z.enum(["challenge", "coaching"]),
  id: z.string().uuid(),
});

export async function POST(request: Request) {
  const session = await requireAuthenticatedSession();
  if (session instanceof NextResponse) return session;

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { kind, id } = parsed.data;

  const target =
    kind === "challenge"
      ? await loadChallengeReminderTarget(session.supabase, id)
      : await loadCoachingReminderTarget(session.supabase, id);

  if (!target) {
    return NextResponse.json({ error: "Review item not found or no longer pending." }, { status: 404 });
  }

  if (target.seUserId !== session.user.id) {
    return NextResponse.json({ error: "You can only nudge for your own submissions." }, { status: 403 });
  }

  const result = await sendReviewReminder(session.supabase, target, "se_nudge");

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.reason,
        eligibility: result.eligibility,
      },
      { status: result.eligibility.canSend ? 502 : 429 },
    );
  }

  return NextResponse.json({ success: true });
}

export async function GET(request: Request) {
  const session = await requireAuthenticatedSession();
  if (session instanceof NextResponse) return session;

  const url = new URL(request.url);
  const itemsParam = url.searchParams.get("items") ?? "";
  const entries = itemsParam
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [kind, id] = part.split(":");
      if ((kind !== "challenge" && kind !== "coaching") || !id) return null;
      return { kind: kind as ReviewReminderKind, id };
    })
    .filter((item): item is { kind: ReviewReminderKind; id: string } => Boolean(item));

  const statuses = await Promise.all(
    entries.map(async ({ kind, id }) => {
      const target =
        kind === "challenge"
          ? await loadChallengeReminderTarget(session.supabase, id)
          : await loadCoachingReminderTarget(session.supabase, id);

      if (!target || target.seUserId !== session.user.id) {
        return { kind, id, canNudge: false, reason: "Not available" };
      }

      const lastReminderAt = await getLastReminderAt(session.supabase, kind, id);
      const eligibility = computeReminderEligibility(target.submittedAt, lastReminderAt);

      return {
        kind,
        id,
        canNudge: eligibility.canSend,
        pendingDays: eligibility.pendingDays,
        lastReminderAt: eligibility.lastReminderAt,
        nextNudgeAt: eligibility.nextReminderAt,
        reason: eligibility.reason ?? null,
      };
    }),
  );

  return NextResponse.json({ items: statuses });
}
