import { NextResponse } from "next/server";
import { z } from "zod";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TENANT_ID } from "@/lib/tenant/types";

const postSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  label: z.string().min(1).max(120).optional(),
});

export async function GET(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tenantParam = searchParams.get("tenantId");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  const tenantId = tenantParam ?? profile?.tenant_id ?? DEFAULT_TENANT_ID;

  const { data, error } = await supabase
    .from("plan_holidays")
    .select("id, holiday_date, label, created_by")
    .eq("tenant_id", tenantId)
    .order("holiday_date");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    holidays: (data ?? []).map((row) => ({
      id: row.id,
      date: row.holiday_date,
      label: row.label,
      createdBy: row.created_by,
    })),
  });
}

export async function POST(request: Request) {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) return session;

  const parsed = postSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: profile } = await session.supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", session.user.id)
    .maybeSingle();

  const tenantId = profile?.tenant_id ?? DEFAULT_TENANT_ID;

  const { data, error } = await session.supabase
    .from("plan_holidays")
    .upsert(
      {
        tenant_id: tenantId,
        holiday_date: parsed.data.date,
        label: parsed.data.label ?? "Blocked day",
        created_by: session.user.id,
      },
      { onConflict: "tenant_id,holiday_date" },
    )
    .select("id, holiday_date, label")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    id: data.id,
    date: data.holiday_date,
    label: data.label,
  });
}
