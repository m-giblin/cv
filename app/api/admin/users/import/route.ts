import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { logAuditEvent } from "@/lib/audit/log-admin-action";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateSailPointEmail } from "@/lib/auth/require-admin";
import { ProfileRole, SeLevel } from "@/lib/types";

const rowSchema = z.object({
 fullName: z.string().min(2),
 email: z.string().email(),
 role: z.string().optional(),
 level: z.string().optional(),
 managerEmail: z.string().email().optional().or(z.literal("")),
});

function parseCsv(text: string) {
 const lines = text.trim().split(/\r?\n/);
 const header = lines[0]?.split(",").map((cell) => cell.trim().toLowerCase()) ?? [];

 return lines.slice(1).map((line, index) => {
 const cells = line.split(",").map((cell) => cell.trim());
 const row: Record<string, string> = {};

 header.forEach((key, cellIndex) => {
 row[key] = cells[cellIndex] ?? "";
 });

 return { line: index + 2, row };
 });
}

const validRoles: ProfileRole[] = [
 "basic_se",
 "senior_se",
 "advisory_solutions_consultant",
 "mentor",
 "manager",
 "director",
 "admin",
];

const validLevels: SeLevel[] = ["Basic", "Senior", "Advisory"];

export async function POST(request: Request) {
 const session = await requireAdminSession();
 if (session instanceof NextResponse) {
 return session;
 }

 const admin = createAdminClient();

 if (!admin) {
 return NextResponse.json({ error: "Service role key required." }, { status: 503 });
 }

 const body = (await request.json()) as { csv: string };
 const rows = parseCsv(body.csv);
 const results: Array<{ line: number; email: string; status: "created" | "error"; message?: string }> = [];

 const { data: allProfiles } = await admin
 .from("profiles")
 .select("id, email")
 .eq("tenant_id", session.tenantId!);
 const emailToId = new Map((allProfiles ?? []).map((profile) => [profile.email.toLowerCase(), profile.id]));

 for (const { line, row } of rows) {
 const parsed = rowSchema.safeParse({
 fullName: row.fullname || row.full_name || row.name,
 email: row.email,
 role: row.role || "basic_se",
 level: row.level || "Basic",
 managerEmail: row.manageremail || row.manager_email || "",
 });

 if (!parsed.success) {
 results.push({ line, email: row.email ?? "?", status: "error", message: "Invalid row format" });
 continue;
 }

 const emailError = validateSailPointEmail(parsed.data.email);

 if (emailError) {
 results.push({ line, email: parsed.data.email, status: "error", message: emailError });
 continue;
 }

 const email = parsed.data.email.trim().toLowerCase();
 const role = validRoles.includes(parsed.data.role as ProfileRole)
 ? (parsed.data.role as ProfileRole)
 : "basic_se";
 const level = validLevels.includes(parsed.data.level as SeLevel)
 ? (parsed.data.level as SeLevel)
 : "Basic";
 const managerId = parsed.data.managerEmail
 ? emailToId.get(parsed.data.managerEmail.trim().toLowerCase()) ?? null
 : null;

 const tempPassword = crypto.randomUUID().replace(/-/g, "").slice(0, 12) + "Aa1!";

 const { data: authData, error: authError } = await admin.auth.admin.createUser({
 email,
 password: tempPassword,
 email_confirm: true,
 user_metadata: { full_name: parsed.data.fullName },
 });

 if (authError) {
 results.push({ line, email, status: "error", message: authError.message });
 continue;
 }

 await admin
 .from("profiles")
 .update({ full_name: parsed.data.fullName, role, level, manager_id: managerId, tenant_id: session.tenantId! })
 .eq("id", authData.user.id);

 results.push({ line, email, status: "created" });
 }

 await logAuditEvent(session.user.id, {
 action: "user.created",
 targetType: "bulk_import",
 tenantId: session.tenantId,
 details: { count: results.filter((result) => result.status === "created").length },
 });

 return NextResponse.json({ results });
}
