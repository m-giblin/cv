import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/auth/require-admin";

const ruleSchema = z.object({
  tag: z.string().min(2).max(80),
  destinationType: z.enum(["slack", "email"]),
  destinationAddress: z.string().min(3).max(200),
  label: z.string().max(120).optional(),
});

export async function GET() {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const { data, error } = await session.supabase
    .from("corpus_routing_rules")
    .select("*")
    .order("tag");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rules: data ?? [] });
}

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const parsed = ruleSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { error } = await session.supabase.from("corpus_routing_rules").insert({
    tag: parsed.data.tag,
    destination_type: parsed.data.destinationType,
    destination_address: parsed.data.destinationAddress,
    label: parsed.data.label ?? null,
    created_by: session.user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
