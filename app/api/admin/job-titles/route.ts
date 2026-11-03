import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit/log-admin-action";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { JOB_TITLE_MAX, JOB_TITLES_MAX, normalizeJobTitles } from "@/lib/tenant/job-titles";

const schema = z.object({
  titles: z
    .array(z.object({ name: z.string().max(JOB_TITLE_MAX * 2), access: z.enum(["learner", "manager", "admin"]) }))
    .max(JOB_TITLES_MAX),
});

const NEEDS_MIGRATION = "Job titles need the 20261103180000_tenant_job_titles migration. Run it in the Supabase SQL editor first.";

/** The job titles this tenant's admins pick from when adding or editing people. */
export async function GET() {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Service role key not configured." }, { status: 503 });
  const { data, error } = await admin.from("tenants").select("job_titles").eq("id", session.tenantId!).maybeSingle();
  // Until the migration runs the column doesn't exist; the app then uses the built-in roles.
  if (error) return NextResponse.json({ titles: [], ready: false, note: NEEDS_MIGRATION });
  return NextResponse.json({ titles: normalizeJobTitles((data as { job_titles?: unknown } | null)?.job_titles), ready: true });
}

export async function PUT(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Service role key not configured." }, { status: 503 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Each title needs a name and an access level." }, { status: 400 });
  const titles = normalizeJobTitles(parsed.data.titles);
  const { error } = await admin
    .from("tenants")
    .update({ job_titles: titles } as never)
    .eq("id", session.tenantId!);
  if (error) return NextResponse.json({ error: /job_titles/.test(error.message) ? NEEDS_MIGRATION : error.message }, { status: 500 });
  await logAuditEvent(session.user.id, {
    action: "tenant.job_titles_updated",
    targetType: "tenant",
    targetId: session.tenantId!,
    tenantId: session.tenantId,
    details: { titles: titles.map((title) => `${title.name} (${title.access})`) },
  });
  return NextResponse.json({ titles, ready: true });
}
