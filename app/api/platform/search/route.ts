import { NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/lib/auth/require-super-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { listSupportRequests } from "@/lib/tenant/support-requests";
import { listTenants } from "@/lib/tenant/tenants";

export async function GET(request: Request) {
 const session = await requireSuperAdminSession();
 if (session instanceof NextResponse) return session;

 const q = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
 if (q.length < 2) {
 return NextResponse.json({ results: [] });
 }

 const admin = createAdminClient();
 const [tenants, tickets] = await Promise.all([
 listTenants(),
 listSupportRequests({ limit: 50 }),
 ]);

 const results: Array<{
 type: "tenant" | "ticket" | "profile";
 id: string;
 label: string;
 sublabel?: string;
 }> = [];

 for (const tenant of tenants) {
 if (tenant.name.toLowerCase().includes(q) || tenant.slug.toLowerCase().includes(q)) {
 results.push({ type: "tenant", id: tenant.id, label: tenant.name, sublabel: tenant.slug });
 }
 }

 for (const ticket of tickets) {
 if (
 ticket.subject.toLowerCase().includes(q) ||
 ticket.tenantName?.toLowerCase().includes(q) ||
 ticket.reporterEmail?.toLowerCase().includes(q)
 ) {
 results.push({
 type: "ticket",
 id: ticket.id,
 label: ticket.subject,
 sublabel: ticket.tenantName ?? undefined,
 });
 }
 }

 if (admin) {
 const { data: profiles } = await admin
 .from("profiles")
 .select("id, full_name, email, tenant_id")
 .or(`email.ilike.%${q}%,full_name.ilike.%${q}%`)
 .limit(10);

 for (const profile of profiles ?? []) {
 results.push({
 type: "profile",
 id: profile.id,
 label: profile.full_name,
 sublabel: profile.email,
 });
 }
 }

 return NextResponse.json({ results: results.slice(0, 20) });
}
