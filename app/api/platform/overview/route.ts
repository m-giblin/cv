import { NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/lib/auth/require-super-admin";
import { listTenants } from "@/lib/tenant/tenants";
import { listTenantHealthSummaries } from "@/lib/tenant/tenant-health";
import { listSupportRequests } from "@/lib/tenant/support-requests";

export async function GET() {
 const session = await requireSuperAdminSession();
 if (session instanceof NextResponse) return session;

 const tenants = await listTenants();
 const [health, openTickets] = await Promise.all([
 listTenantHealthSummaries(tenants),
 listSupportRequests({ status: "active", limit: 50 }),
 ]);

 const totalOpenTickets = openTickets.length;
 const tenantsNeedingAttention = health.filter((item) => item.alerts.length > 0).length;

 return NextResponse.json({
 summary: {
 tenantCount: tenants.length,
 totalOpenTickets,
 tenantsNeedingAttention,
 },
 health,
 recentTickets: openTickets.slice(0, 10),
 });
}
