import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdminSession } from "@/lib/auth/require-super-admin";
import {
 getTenantById,
 listTenantInvites,
 provisionTenantAdmin,
 updateOperatorNotes,
 updateTenantBranding,
 updateTenantMaintenance,
 updateTenantStatus,
} from "@/lib/tenant/tenants";
import type { TenantStatus } from "@/lib/tenant/types";

const brandingSchema = z.object({
 primaryColor: z.string().optional(),
 logoUrl: z.string().url().nullable().optional(),
 welcomeMessage: z.string().nullable().optional(),
 allowedEmailDomains: z.array(z.string()).optional(),
});

const patchSchema = z.object({
 branding: brandingSchema.optional(),
 status: z.enum(["active", "suspended", "provisioning"]).optional(),
 operatorNotes: z.string().max(10000).nullable().optional(),
 maintenanceMode: z.boolean().optional(),
 maintenanceMessage: z.string().max(2000).nullable().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
 const session = await requireSuperAdminSession();
 if (session instanceof NextResponse) return session;

 const { id } = await context.params;
 const [tenant, invites] = await Promise.all([getTenantById(id), listTenantInvites(id)]);

 if (!tenant) {
 return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
 }

 return NextResponse.json({ tenant, invites });
}

export async function PATCH(request: Request, context: RouteContext) {
 const session = await requireSuperAdminSession();
 if (session instanceof NextResponse) return session;

 const { id } = await context.params;
 const body = await request.json().catch(() => null);
 const parsed = patchSchema.safeParse(body);
 if (!parsed.success) {
 return NextResponse.json({ error: "Invalid tenant update payload." }, { status: 400 });
 }

 try {
 let tenant = await getTenantById(id);
 if (!tenant) {
 return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
 }

 if (parsed.data.branding) {
 tenant = await updateTenantBranding(id, parsed.data.branding, session.user.id);
 }
 if (parsed.data.status) {
 tenant = await updateTenantStatus(id, parsed.data.status as TenantStatus, session.user.id);
 }
 if (parsed.data.operatorNotes !== undefined) {
 tenant = await updateOperatorNotes(id, parsed.data.operatorNotes, session.user.id);
 }
 if (parsed.data.maintenanceMode !== undefined) {
 tenant = await updateTenantMaintenance(
 id,
 {
 maintenanceMode: parsed.data.maintenanceMode,
 maintenanceMessage: parsed.data.maintenanceMessage,
 },
 session.user.id,
 );
 }

 return NextResponse.json({ tenant });
 } catch (error) {
 return NextResponse.json(
 { error: error instanceof Error ? error.message : "Failed to update tenant." },
 { status: 500 },
 );
 }
}

const inviteSchema = z.object({
 email: z.string().email(),
 fullName: z.string().min(2),
 sendInvite: z.boolean().optional(),
});

export async function POST(request: Request, context: RouteContext) {
 const session = await requireSuperAdminSession();
 if (session instanceof NextResponse) return session;

 const { id } = await context.params;
 const body = await request.json().catch(() => null);
 const parsed = inviteSchema.safeParse(body);
 if (!parsed.success) {
 return NextResponse.json({ error: "Invalid invite payload." }, { status: 400 });
 }

 try {
 const inviteSent = await provisionTenantAdmin({
 tenantId: id,
 email: parsed.data.email,
 fullName: parsed.data.fullName,
 invitedBy: session.user.id,
 sendInvite: parsed.data.sendInvite,
 });
 const invites = await listTenantInvites(id);
 return NextResponse.json({ inviteSent, invites }, { status: 201 });
 } catch (error) {
 return NextResponse.json(
 { error: error instanceof Error ? error.message : "Failed to invite tenant admin." },
 { status: 500 },
 );
 }
}
