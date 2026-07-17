import { NextResponse } from "next/server";
import { logAuditEvent } from "@/lib/audit/log-admin-action";
import { requireSuperAdminSession } from "@/lib/auth/require-super-admin";
import { listPlatformAuditLogs } from "@/lib/tenant/tenants";

export async function GET(request: Request) {
  const session = await requireSuperAdminSession();
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId") ?? undefined;
  const actionPrefix = searchParams.get("actionPrefix") ?? undefined;
  const platformOpsOnly = searchParams.get("platformOpsOnly") === "1";
  const limit = Number(searchParams.get("limit") ?? "200");

  const logs = await listPlatformAuditLogs({
    tenantId,
    actionPrefix,
    platformOpsOnly,
    limit: Number.isFinite(limit) ? Math.min(limit, 500) : 200,
  });

  return NextResponse.json({ logs });
}

/** Probe write path — inserts an audit.probe row and reports rpc vs direct. */
export async function POST(request: Request) {
  const session = await requireSuperAdminSession();
  if (session instanceof NextResponse) return session;

  const body = (await request.json().catch(() => ({}))) as { tenantId?: string };
  const result = await logAuditEvent(session.user.id, {
    action: "audit.probe",
    targetType: "audit",
    targetId: `probe-${Date.now()}`,
    tenantId: body.tenantId ?? null,
    details: {
      source: "platform-audit-panel",
      at: new Date().toISOString(),
    },
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? "Audit write failed." },
      { status: 500 },
    );
  }

  // Double-check the row is readable in the list path.
  const logs = await listPlatformAuditLogs({ limit: 5 });
  const found = logs.some((entry) => entry.id === result.id || entry.action === "audit.probe");

  return NextResponse.json({
    ok: true,
    via: result.via,
    id: result.id,
    readable: found,
  });
}
