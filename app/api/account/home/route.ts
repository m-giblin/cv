import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";
import { getAccessTier } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProfileRole } from "@/lib/types";

const schema = z.object({
  homeTenantId: z.string().uuid().nullable(),
  level: z.enum(["Basic", "Senior", "Advisory"]),
});

async function superAdminOnly() {
  const session = await requireAuthenticatedSession();
  if (session instanceof NextResponse) return session;
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  const { data } = await admin.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
  const profile = data as { role: ProfileRole; level: string; home_tenant_id?: string | null } | null;
  if (!profile || getAccessTier(profile.role) !== "super_admin") {
    return NextResponse.json({ error: "Only super admins have a home workspace." }, { status: 403 });
  }
  return { session, admin, profile };
}

/** The super admin's home workspace for their own training, and their SE level. */
export async function GET() {
  const ctx = await superAdminOnly();
  if (ctx instanceof NextResponse) return ctx;
  const { data: tenants } = await ctx.admin.from("tenants").select("id, name").order("name");
  return NextResponse.json({
    homeTenantId: ctx.profile.home_tenant_id ?? null,
    level: ctx.profile.level,
    tenants: tenants ?? [],
    ready: "home_tenant_id" in ctx.profile,
  });
}

export async function PATCH(request: Request) {
  const ctx = await superAdminOnly();
  if (ctx instanceof NextResponse) return ctx;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pick a workspace and a level." }, { status: 400 });
  const { error } = await ctx.admin
    .from("profiles")
    .update({ home_tenant_id: parsed.data.homeTenantId, level: parsed.data.level, updated_at: new Date().toISOString() } as never)
    .eq("id", ctx.session.user.id);
  if (error) {
    return NextResponse.json(
      { error: error.message.includes("home_tenant_id") ? "Apply the home workspace database migration first." : error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
