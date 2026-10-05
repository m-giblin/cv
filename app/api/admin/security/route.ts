import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { tenantTable } from "@/lib/data/tenant-scoped-query";

const INACTIVE_THRESHOLD_DAYS = 90;

export type AdminSecurityData = {
  sso: { enabled: boolean; provider: string | null; ssoDomain: string | null } | null;
  recentActions: Array<{
    id: string;
    action: string;
    targetType: string;
    targetId: string | null;
    createdAt: string;
  }>;
  inactiveAccounts: Array<{ id: string; fullName: string; email: string; role: string }>;
  inactiveThresholdDays: number;
};

export async function GET() {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const scoped = tenantTable(session.tenantId);
  if (!scoped) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  const since = new Date(Date.now() - INACTIVE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const [ssoResult, actionsResult, profilesResult, recentActivityResult] = await Promise.all([
    // SSO config is normally super-admin-only via RLS; safe to read here via
    // the service-role tenant-scoped client because requireAdminSession()
    // has already authorized this caller for exactly this tenant.
    scoped.admin
      .from("tenant_sso_configs")
      .select("enabled, provider, sso_domain")
      .eq("tenant_id", session.tenantId)
      .maybeSingle(),
    scoped
      .select("audit_logs", "id, action, target_type, target_id, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    scoped.select("profiles", "id, full_name, email, role"),
    scoped.select("activity_logs", "user_id, created_at").gte("created_at", since),
  ]);

  const recentlyActiveUserIds = new Set(
    ((recentActivityResult.data ?? []) as unknown as Array<{ user_id: string }>).map((row) => row.user_id),
  );

  const profiles = (profilesResult.data ?? []) as unknown as Array<{
    id: string;
    full_name: string;
    email: string;
    role: string;
  }>;

  const inactiveAccounts = profiles
    .filter((profile) => !recentlyActiveUserIds.has(profile.id))
    .map((profile) => ({
      id: profile.id,
      fullName: profile.full_name,
      email: profile.email,
      role: profile.role,
    }));

  const ssoRow = ssoResult.data as { enabled: boolean; provider: string; sso_domain: string | null } | null;

  const body: AdminSecurityData = {
    sso: ssoRow
      ? { enabled: ssoRow.enabled, provider: ssoRow.provider, ssoDomain: ssoRow.sso_domain }
      : null,
    recentActions: ((actionsResult.data ?? []) as unknown as Array<{
      id: string;
      action: string;
      target_type: string;
      target_id: string | null;
      created_at: string;
    }>).map((row) => ({
      id: row.id,
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      createdAt: row.created_at,
    })),
    inactiveAccounts,
    inactiveThresholdDays: INACTIVE_THRESHOLD_DAYS,
  };

  return NextResponse.json(body);
}
