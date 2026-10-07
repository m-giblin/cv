import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { setSourceSolution } from "@/lib/question-bank/data";

const schema = z.object({
  kind: z.enum(["playbook", "docs", "developer", "manual"]),
  playbookId: z.string().uuid().nullable().optional(),
  topic: z.string().max(120).default(""),
  solution: z.string().trim().min(2).max(80),
});

/** Files a whole bank under a different SailPoint solution. */
export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const input = parsed.data;
  await setSourceSolution(session.tenantId, { kind: input.kind, playbookId: input.playbookId ?? null, topic: input.topic }, input.solution);
  return NextResponse.json({ ok: true });
}
