import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdminSession } from "@/lib/auth/require-super-admin";
import { createTenant, listTenants } from "@/lib/tenant/tenants";

const createSchema = z.object({
 name: z.string().min(2).max(120),
 slug: z.string().min(2).max(64),
 adminEmail: z.string().email().optional(),
 adminFullName: z.string().min(2).optional(),
 sendAdminInvite: z.boolean().optional(),
 branding: z
 .object({
 primaryColor: z.string().optional(),
 logoUrl: z.string().url().nullable().optional(),
 welcomeMessage: z.string().nullable().optional(),
 allowedEmailDomains: z.array(z.string()).optional(),
 })
 .optional(),
});

export async function GET() {
 const session = await requireSuperAdminSession();
 if (session instanceof NextResponse) return session;

 const tenants = await listTenants();
 return NextResponse.json({ tenants });
}

export async function POST(request: Request) {
 const session = await requireSuperAdminSession();
 if (session instanceof NextResponse) return session;

 const body = await request.json().catch(() => null);
 const parsed = createSchema.safeParse(body);
 if (!parsed.success) {
 return NextResponse.json({ error: "Invalid tenant payload." }, { status: 400 });
 }

 if (parsed.data.adminEmail && !parsed.data.adminFullName) {
 return NextResponse.json({ error: "adminFullName required when adminEmail is set." }, { status: 400 });
 }

 try {
 const result = await createTenant(parsed.data, session.user.id);
 return NextResponse.json(result, { status: 201 });
 } catch (error) {
 return NextResponse.json(
 { error: error instanceof Error ? error.message : "Failed to create tenant." },
 { status: 500 },
 );
 }
}
