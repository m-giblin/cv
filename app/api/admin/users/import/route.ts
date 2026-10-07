import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit/log-admin-action";
import { requireAdminSession, validateSailPointEmail } from "@/lib/auth/require-admin";
import { readPeopleCsv } from "@/lib/admin/people-csv";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  csv: z.string().min(1).max(2_000_000),
  /** preview: check every row and report; import: create the new people (inactive, no email). */
  mode: z.enum(["preview", "import"]).default("preview"),
});

type RowResult = {
  line: number;
  fullName: string;
  email: string;
  role: string;
  level: string;
  managerEmail: string;
  status: "new" | "exists" | "problem" | "created" | "error";
  message?: string;
};

/**
 * Bulk upload. Preview checks every row first; import adds only the new, valid rows. Everyone added
 * here is inactive and uninvited until an admin activates and invites them from the People list.
 */
export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Service role key required." }, { status: 503 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Upload a CSV file." }, { status: 400 });
  const rows = readPeopleCsv(parsed.data.csv, validateSailPointEmail);
  if (!rows.length) return NextResponse.json({ error: "The file has no rows under the header." }, { status: 400 });
  if (rows.length > 500) return NextResponse.json({ error: "Upload at most 500 people at a time." }, { status: 400 });

  // Existing people anywhere (an email can only belong to one account), and managers in this tenant.
  const emails = rows.map((row) => row.email).filter(Boolean);
  const { data: existing } = await admin.from("profiles").select("id, email, tenant_id").in("email", emails);
  const existingEmails = new Set(((existing ?? []) as { email: string }[]).map((row) => row.email.toLowerCase()));
  const { data: tenantPeople } = await admin.from("profiles").select("id, email").eq("tenant_id", session.tenantId!);
  const idByEmail = new Map(((tenantPeople ?? []) as { id: string; email: string }[]).map((row) => [row.email.toLowerCase(), row.id]));
  const newEmails = new Set(rows.filter((row) => !row.problem && !existingEmails.has(row.email)).map((row) => row.email));

  const results: RowResult[] = rows.map((row) => {
    const base = { line: row.line, fullName: row.fullName, email: row.email, role: row.role, level: row.level, managerEmail: row.managerEmail };
    if (row.problem) return { ...base, status: "problem", message: row.problem };
    if (existingEmails.has(row.email)) return { ...base, status: "exists", message: "Already in the platform; skipped" };
    if (row.managerEmail && !idByEmail.has(row.managerEmail) && !newEmails.has(row.managerEmail)) {
      return { ...base, status: "new", message: `Manager ${row.managerEmail} isn't in this workspace; they'll have no manager` };
    }
    return { ...base, status: "new" };
  });

  if (parsed.data.mode === "preview") return NextResponse.json({ results });

  // Create new people first, then set managers (a manager may be new in the same file).
  const created: { id: string; managerEmail: string }[] = [];
  for (const result of results) {
    if (result.status !== "new") continue;
    const tempPassword = `${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}Aa1!`;
    const { data: authData, error } = await admin.auth.admin.createUser({
      email: result.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: result.fullName },
    });
    if (error || !authData.user) {
      Object.assign(result, { status: "error", message: error?.message ?? "Couldn't create the account" });
      continue;
    }
    const { error: profileError } = await admin
      .from("profiles")
      .update({
        full_name: result.fullName,
        role: result.role as never,
        level: result.level as never,
        tenant_id: session.tenantId!,
        status: "inactive",
      } as never)
      .eq("id", authData.user.id);
    if (profileError) {
      Object.assign(result, { status: "error", message: profileError.message });
      continue;
    }
    idByEmail.set(result.email, authData.user.id);
    created.push({ id: authData.user.id, managerEmail: result.managerEmail });
    Object.assign(result, { status: "created" });
  }
  for (const person of created) {
    const managerId = person.managerEmail ? idByEmail.get(person.managerEmail) : null;
    if (managerId) await admin.from("profiles").update({ manager_id: managerId }).eq("id", person.id);
  }

  await logAuditEvent(session.user.id, {
    action: "user.created",
    targetType: "bulk_import",
    tenantId: session.tenantId,
    details: { count: created.length, status: "inactive" },
  });
  return NextResponse.json({ results });
}
