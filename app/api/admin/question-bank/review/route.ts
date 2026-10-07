import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { reviewQuestions } from "@/lib/question-bank/data";

const schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  action: z.enum(["approve", "reject"]),
  /** add: join the rotation. replace: retire the source's current questions too. */
  mode: z.enum(["add", "replace"]).default("add"),
});

/** Approve or reject drafts; also retires active questions ("reject" on an active one). */
export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  try {
    const result = await reviewQuestions({ tenantId: session.tenantId, userId: session.user.id, ...parsed.data });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Couldn't save." }, { status: 500 });
  }
}
