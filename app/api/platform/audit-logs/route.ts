import { NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/lib/auth/require-super-admin";
import { listPlatformAuditLogs } from "@/lib/tenant/tenants";

export async function GET(request: Request) {
 const session = await requireSuperAdminSession();
 if (session instanceof NextResponse) return session;

 const { searchParams } = new URL(request.url);
 const tenantId = searchParams.get("tenantId") ?? undefined;
 const limit = Number(searchParams.get("limit") ?? "200");

 const logs = await listPlatformAuditLogs({
 tenantId,
 limit: Number.isFinite(limit) ? Math.min(limit, 500) : 200,
 });

 return NextResponse.json({ logs });
}
