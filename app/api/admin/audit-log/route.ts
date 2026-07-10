import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { tenantTable } from "@/lib/data/tenant-scoped-query";

export async function GET(request: Request) {
 const session = await requireAdminSession();
 if (session instanceof NextResponse) {
 return session;
 }

 const scoped = tenantTable(session.tenantId);
 if (!scoped) {
 return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
 }

 const url = new URL(request.url);
 const format = url.searchParams.get("format");

 const { data, error } = await scoped.select("audit_logs", "id, actor_id, action, target_type, target_id, details, created_at")
 .order("created_at", { ascending: false })
 .limit(500);

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 const logs = (data ?? []) as unknown as Array<{
 created_at: string;
 action: string;
 target_type: string;
 target_id: string | null;
 actor_id: string | null;
 details: unknown;
 }>;

 if (format === "csv") {
 const header = "timestamp,action,target_type,target_id,actor_id,details\n";
 const rows = logs
 .map((log) =>
 [
 log.created_at,
 log.action,
 log.target_type,
 log.target_id ?? "",
 log.actor_id ?? "",
 JSON.stringify(log.details).replaceAll('"', '""'),
 ]
 .map((value) => `"${value}"`)
 .join(","),
 )
 .join("\n");

 return new NextResponse(header + rows, {
 headers: {
 "Content-Type": "text/csv",
 "Content-Disposition": `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
 },
 });
 }

 return NextResponse.json({ logs });
}
