import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";
import { ForgeApiError, addForgeComment } from "@/lib/forge/client";

const commentSchema = z.object({
  body: z.string().min(1).max(10_000),
  author_label: z.string().max(200).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuthenticatedSession();
  if (session instanceof NextResponse) {
    return session;
  }

  const { id } = await params;
  const parsed = commentSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await addForgeComment(
      id,
      parsed.data.body,
      parsed.data.author_label ?? session.user.email ?? "UAT tester",
    );
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof ForgeApiError ? error.message : "Failed to add comment.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
