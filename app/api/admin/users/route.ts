import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit/log-admin-action";
import { validateSailPointEmail, requireAdminSession } from "@/lib/auth/require-admin";
import { validateEmailForTenant } from "@/lib/auth/tenant-email";
import { createAdminClient } from "@/lib/supabase/admin";
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

 const { data, error } = await admin
 .from("profiles")
 .select("id, email, full_name, role, level, manager_id, created_at")
 .eq("tenant_id", session.tenantId!)
 .order("full_name");

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

 const email = parsed.data.email.trim().toLowerCase();
 const tempPassword = parsed.data.password ?? crypto.randomUUID().replace(/-/g, "").slice(0, 12) + "Aa1!";

 const { data: authData, error: authError } = await admin.auth.admin.createUser({
 email,
 password: tempPassword,
 email_confirm: true,
 user_metadata: { full_name: parsed.data.fullName },
 });

 if (authError) {
 return NextResponse.json({ error: authError.message }, { status: 400 });
 }

 const userId = authData.user.id;

 const { error: profileError } = await admin
 .from("profiles")
 .update({
 full_name: parsed.data.fullName,
 role: parsed.data.role,
 level: parsed.data.level,
 manager_id: parsed.data.managerId ?? null,
 tenant_id: session.tenantId!,
 })
 .eq("id", userId);

 if (profileError) {
 await admin.auth.admin.deleteUser(userId);
 return NextResponse.json({ error: profileError.message }, { status: 500 });
 }

 if (parsed.data.sendInvite) {
 const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
 await admin.auth.resetPasswordForEmail(email, {
 redirectTo: `${siteUrl}/auth/reset-password`,
 });
 }

 await logAuditEvent(session.user.id, {
 action: "user.created",
 targetType: "profile",
 targetId: userId,
 tenantId: session.tenantId,
 details: { email, role: parsed.data.role, level: parsed.data.level },
 });

 return NextResponse.json({
 user: {
 id: userId,
 email,
 full_name: parsed.data.fullName,
 role: parsed.data.role,
 level: parsed.data.level,
 manager_id: parsed.data.managerId ?? null,
 },
 inviteSent: Boolean(parsed.data.sendInvite),
 ...(parsed.data.sendInvite
 ? {}
 : {
 passwordDelivery:
 "Temporary password was set at creation. Use sendInvite for email-based onboarding instead of returning credentials in API responses.",
 }),
 });
}
