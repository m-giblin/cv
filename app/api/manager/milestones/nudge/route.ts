import { NextResponse } from "next/server";
import { z } from "zod";
import { requireManagerSession } from "@/lib/auth/require-manager";
import {
  getMilestoneNudgeStatus,
  sendMilestoneNudge,
} from "@/lib/manager/milestone-actions";

const nudgeSchema = z.object({
  userId: z.string().uuid(),
  assignmentStepId: z.string().uuid(),
  milestoneLabel: z.string().min(1),
});

export async function GET(request: Request) {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) return session;

  const url = new URL(request.url);
  const ids = url.searchParams.get("stepIds")?.split(",").filter(Boolean) ?? [];
  if (ids.length === 0) {
    return NextResponse.json({ items: {} });
  }

  const items = await getMilestoneNudgeStatus(session.supabase, session.user.id, ids);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) return session;

  const parsed = nudgeSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await sendMilestoneNudge(session.supabase, {
    managerId: session.user.id,
    seUserId: parsed.data.userId,
    assignmentStepId: parsed.data.assignmentStepId,
    milestoneLabel: parsed.data.milestoneLabel,
  });

  if (!result.success) {
    return NextResponse.json(
      { error: result.reason, nextNudgeAt: result.nextNudgeAt, canNudge: false },
      { status: 429 },
    );
  }

  return NextResponse.json({ success: true, nextNudgeAt: result.nextNudgeAt, canNudge: false });
}
