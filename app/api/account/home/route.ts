import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";
import { getAccessTier } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeWorkspaceMembership, workspaceTenantIds } from "@/lib/tenant/workspace-members";
import type { ProfileRole } from "@/lib/types";

const schema = z.object({
  homeTenantId: z.string().uuid().nullable(),
  /** Every workspace the super admin belongs to. Omitted by older clients: home only. */
  memberTenantIds: z.array(z.string().uuid()).max(50).optional(),
  level: z.enum(["Basic", "Senior", "Advisory"]),
});

type SuperAdminProfile = {
  role: ProfileRole;
  level: string;
  tenant_id?: string | null;
  home_tenant_id?: string | null;
  member_tenant_ids?: string[] | null;
};

async function superAdminOnly() {
  const session = await requireAuthenticatedSession();
  if (session instanceof NextResponse) return session;
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  const { data } = await admin.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
  const profile = data as SuperAdminProfile | null;
  if (!profile || getAccessTier(profile.role) !== "super_admin") {
    return NextResponse.json({ error: "Only super admins have workspaces." }, { status: 403 });
  }
  return { session, admin, profile };
}

/** The super admin's workspaces (home first), their default (home) workspace, and their SE level. */
export async function GET() {
  const ctx = await superAdminOnly();
  if (ctx instanceof NextResponse) return ctx;
  const { data: tenants } = await ctx.admin.from("tenants").select("id, name").order("name");
  return NextResponse.json({
    homeTenantId: ctx.profile.home_tenant_id ?? null,
    memberTenantIds: workspaceTenantIds({ home_tenant_id: ctx.profile.home_tenant_id, member_tenant_ids: ctx.profile.member_tenant_ids }),
    level: ctx.profile.level,
    tenants: tenants ?? [],
    ready: "home_tenant_id" in ctx.profile,
    multiReady: "member_tenant_ids" in ctx.profile,
  });
}

export async function PATCH(request: Request) {
  const ctx = await superAdminOnly();
  if (ctx instanceof NextResponse) return ctx;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pick your workspaces and a level." }, { status: 400 });

  const multiReady = "member_tenant_ids" in ctx.profile;
  const requested = parsed.data.memberTenantIds ?? (parsed.data.homeTenantId ? [parsed.data.homeTenantId] : []);
  const membership = normalizeWorkspaceMembership(requested, parsed.data.homeTenantId);
  if (membership.memberTenantIds.length > 1 && !multiReady) {
    return NextResponse.json({ error: "Apply the workspaces database migration to join more than one workspace." }, { status: 400 });
  }

  // Only real workspaces can be joined.
  if (membership.memberTenantIds.length > 0) {
    const { data: found } = await ctx.admin.from("tenants").select("id").in("id", membership.memberTenantIds);
    if ((found ?? []).length !== membership.memberTenantIds.length) {
      return NextResponse.json({ error: "One of those workspaces no longer exists." }, { status: 400 });
    }
  }

  const update: Record<string, unknown> = {
    home_tenant_id: membership.homeTenantId,
    level: parsed.data.level,
    updated_at: new Date().toISOString(),
  };
  if (multiReady) update.member_tenant_ids = membership.memberTenantIds;

  const { error } = await ctx.admin.from("profiles").update(update as never).eq("id", ctx.session.user.id);
  if (error) {
    return NextResponse.json(
      { error: error.message.includes("home_tenant_id") ? "Apply the home workspace database migration first." : error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, ...membership });
}
