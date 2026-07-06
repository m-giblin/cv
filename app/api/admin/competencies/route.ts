import { NextResponse } from "next/server";
import { z } from "zod";
import { auditMutation } from "@/lib/audit/audit-mutation";
import { requireAdminSession } from "@/lib/auth/require-admin";

const schema = z.object({
  name: z.string().min(2),
  category: z.string().min(2),
  description: z.string().optional(),
  rubric: z.array(z.object({ level: z.number(), label: z.string(), description: z.string() })).optional(),
});

export async function GET() {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) {
    return session;
  }

  const { data, error } = await session.supabase.from("competencies").select("*").order("category").order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ competencies: data });
}

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) {
    return session;
  }

  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await session.supabase
    .from("competencies")
    .insert({
      name: parsed.data.name,
      category: parsed.data.category,
      description: parsed.data.description ?? null,
      rubric: parsed.data.rubric ?? [],
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  auditMutation(session.user.id, "competency.created", "competency", data.id, { name: parsed.data.name });

  return NextResponse.json({ id: data.id });
}
