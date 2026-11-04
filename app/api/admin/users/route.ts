import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit/log-admin-action";
import { newTemporaryPassword, unusablePassword, type AccessMetadata } from "@/lib/auth/account-access";
import { issueActivationCode } from "@/lib/auth/account-access-server";
import { validateSailPointEmail, requireAdminSession } from "@/lib/auth/require-admin";
import { validateEmailForTenant } from "@/lib/auth/tenant-email";
import { createAdminClient } from "@/lib/supabase/admin";
import { legacyWorkspaceMemberFilter, workspaceMemberFilter } from "@/lib/tenant/workspace-members";
import { roleForJobTitle } from "@/lib/tenant/job-titles";
import { resolveJobTitle } from "@/lib/tenant/job-titles-server";
import { ProfileRole, SeLevel } from "@/lib/types";

const createUserSchema = z.object({
 fullName: z.string().min(2),
 email: z.string().email(),
 password: z.string().min(8).optional(),
 role: z.enum([
 "basic_se",
 "senior_se",
 "advisory_solutions_consultant",
 "mentor",
 "manager",
 "director",
 "admin",
 ] as [ProfileRole, ...ProfileRole[]]),
 level: z.enum(["Basic", "Senior", "Advisory"] as [SeLevel, ...SeLevel[]]),
 managerId: z.string().uuid().nullable().optional(),
 sendInvite: z.boolean().optional(),
 /**
  * How the person gets in: an activation code the admin shares (default), a temporary password they
  * must replace at first sign-in, or Supabase's email link (often blocked by corporate filters).
  */
 onboarding: z.enum(["code", "password", "email"]).optional(),
 /** One of the tenant's job titles; when set, its access level decides the role. */
 jobTitle: z.string().max(120).nullable().optional(),
});

export async function GET() {
 const session = await requireAdminSession();
 if (session instanceof NextResponse) {
 return session;
 }

 const admin = createAdminClient();

 if (!admin) {
 return NextResponse.json(
 { error: "SUPABASE_SERVICE_ROLE_KEY is required for user management." },
 { status: 503 },
 );
 }

 // Status and invite date come from a newer migration; fall back without them until it's applied.
 const base = "id, email, full_name, role, level, manager_id, created_at";
 // Members, plus super admins who belong to this workspace (home or one of their workspaces).
 const members = (columns: string, filter: string) =>
 admin.from("profiles").select(columns).or(filter).order("full_name");
 // Job titles and workspace lists come from newer migrations; without them the list reads as before.
 type Result = { data: { id: string }[] | null; error: { message: string } | null };
 let { data, error } = (await members(`${base}, status, invited_at, job_title`, workspaceMemberFilter(session.tenantId!))) as unknown as Result;
 if (error) ({ data, error } = (await members(`${base}, status, invited_at, job_title`, legacyWorkspaceMemberFilter(session.tenantId!))) as unknown as Result);
 if (error) ({ data, error } = (await members(`${base}, status, invited_at`, legacyWorkspaceMemberFilter(session.tenantId!))) as unknown as Result);
 if (error) {
 ({ data, error } = (await admin.from("profiles").select(base).eq("tenant_id", session.tenantId!).order("full_name")) as unknown as {
 data: typeof data;
 error: typeof error;
 });
 }

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 return NextResponse.json({ users: data });
}

export async function POST(request: Request) {
 const session = await requireAdminSession();
 if (session instanceof NextResponse) {
 return session;
 }

 const admin = createAdminClient();

 if (!admin) {
 return NextResponse.json(
 { error: "SUPABASE_SERVICE_ROLE_KEY is required for user management." },
 { status: 503 },
 );
 }

 const parsed = createUserSchema.safeParse(await request.json());

 if (!parsed.success) {
 return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 }

 const emailError = validateSailPointEmail(parsed.data.email);

 if (emailError) {
 return NextResponse.json({ error: emailError }, { status: 400 });
 }

 const tenantEmailError = await validateEmailForTenant(parsed.data.email, session.tenantId);
 if (tenantEmailError) {
 return NextResponse.json({ error: tenantEmailError }, { status: 400 });
 }

 const jobTitle = parsed.data.jobTitle ? await resolveJobTitle(admin, session.tenantId!, parsed.data.jobTitle) : { title: null };
 if ("error" in jobTitle) {
 return NextResponse.json({ error: jobTitle.error }, { status: 400 });
 }
 const role = jobTitle.title ? roleForJobTitle(jobTitle.title, parsed.data.role) : parsed.data.role;

 const email = parsed.data.email.trim().toLowerCase();
 const onboarding = parsed.data.onboarding ?? (parsed.data.sendInvite ? "email" : parsed.data.password ? "password" : "code");
 // Only a temporary password is ever known to anyone; code and email accounts start with one nobody has.
 const tempPassword = onboarding === "password" ? (parsed.data.password ?? newTemporaryPassword()) : unusablePassword();

 // A platform super admin already has a sign-in; they join workspaces themselves rather than
 // getting a second account here.
 const { data: existing } = await admin.from("profiles").select("role").eq("email", email).maybeSingle();
 if ((existing as { role?: string } | null)?.role === "super_admin") {
 return NextResponse.json(
 {
 error:
 "That's a platform super admin's sign-in. They can join this workspace with the same sign-in from Account → Your workspaces, then they'll appear here.",
 },
 { status: 409 },
 );
 }

 const { data: authData, error: authError } = await admin.auth.admin.createUser({
 email,
 password: tempPassword,
 email_confirm: true,
 user_metadata: { full_name: parsed.data.fullName },
 app_metadata: onboarding === "password" ? ({ must_change_password: true } satisfies AccessMetadata) : {},
 });

 if (authError) {
 return NextResponse.json({ error: authError.message }, { status: 400 });
 }

 const userId = authData.user.id;

 const { error: profileError } = await admin
 .from("profiles")
 .update({
 full_name: parsed.data.fullName,
 role,
 level: parsed.data.level,
 manager_id: parsed.data.managerId ?? null,
 tenant_id: session.tenantId!,
 // Only sent when set, so adding people works before the job titles migration.
 ...(jobTitle.title ? { job_title: jobTitle.title.name } : {}),
 } as never)
 .eq("id", userId);

 if (profileError) {
 await admin.auth.admin.deleteUser(userId);
 return NextResponse.json({ error: profileError.message }, { status: 500 });
 }

 if (onboarding === "email") {
 const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
 await admin.auth.resetPasswordForEmail(email, {
 redirectTo: `${siteUrl}/auth/reset-password`,
 });
 }
 const activation = onboarding === "code" ? await issueActivationCode(admin, userId).catch(() => null) : null;

 await logAuditEvent(session.user.id, {
 action: "user.created",
 targetType: "profile",
 targetId: userId,
 tenantId: session.tenantId,
 details: { email, role, level: parsed.data.level, onboarding, jobTitle: jobTitle.title?.name ?? null },
 });

 return NextResponse.json({
 user: {
 id: userId,
 email,
 full_name: parsed.data.fullName,
 role,
 level: parsed.data.level,
 manager_id: parsed.data.managerId ?? null,
 job_title: jobTitle.title?.name ?? null,
 },
 inviteSent: onboarding === "email",
 // Shown to the admin once, to pass on; neither is stored in a readable form.
 ...(onboarding === "password" ? { temporaryPassword: tempPassword } : {}),
 ...(activation ? { activationCode: activation.code, activationExpiresAt: activation.expiresAt } : {}),
 ...(onboarding === "code" && !activation ? { activationError: "The account was created, but the code couldn't be issued. Use \"New activation code\" on the user." } : {}),
 });
}
