import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";
import { FORGE_PRIORITIES, FORGE_STATUSES } from "@/lib/forge/config";
import { ForgeApiError, updateForgeIssue } from "@/lib/forge/client";

const patchSchema = z
  .object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(20_000).nullable().optional(),
    status: z.enum(FORGE_STATUSES).optional(),
    priority: z.enum(FORGE_PRIORITIES).optional(),
    category_id: z.string().uuid().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "No fields to update." });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuthenticatedSession();
  if (session instanceof NextResponse) {
    return session;
  }

  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const issue = await updateForgeIssue(id, parsed.data);
    return NextResponse.json({ data: issue });
  } catch (error) {
    const message = error instanceof ForgeApiError ? error.message : "Failed to update issue.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
