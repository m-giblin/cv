import { NextResponse } from "next/server";
import { z } from "zod";
import { auditMutation } from "@/lib/audit/audit-mutation";
import { requireAdminSession } from "@/lib/auth/require-admin";

const schema = z.object({
  name: z.string().min(2).optional(),
  category: z.string().min(2).optional(),
  description: z.string().optional(),
  rubric: z.array(z.object({ level: z.number(), label: z.string(), description: z.string() })).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) {
    return session;
  }

  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { error } = await session.supabase.from("competencies").update(parsed.data).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  auditMutation(session.user.id, "competency.updated", "competency", id, parsed.data);

  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) {
    return session;
  }

  const { id } = await context.params;
  const { error } = await session.supabase.from("competencies").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  auditMutation(session.user.id, "competency.deleted", "competency", id);

  return NextResponse.json({ success: true });
}
