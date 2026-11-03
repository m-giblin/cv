import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { PRODUCT_NAME, PRODUCT_TAGLINE, PRODUCT_TEXT_MAX_LENGTH } from "@/lib/tenant/shell-branding-shared";
import { DEFAULT_LEARNER_TERMS, LEARNER_TERM_MAX_LENGTH } from "@/lib/tenant/learner-terms";
import { getTenantById, updateTenantBranding } from "@/lib/tenant/tenants";

const brandText = z.string().trim().max(PRODUCT_TEXT_MAX_LENGTH).nullable();

const updateSchema = z.object({
 productName: brandText.optional(),
 productTagline: brandText.optional(),
 learnerTerm: z.string().trim().max(LEARNER_TERM_MAX_LENGTH).nullable().optional(),
 learnerTermPlural: z.string().trim().max(LEARNER_TERM_MAX_LENGTH).nullable().optional(),
});

/** The tenant's app name and subtitle, as shown in the header, page titles and emails. */
export async function GET() {
 const session = await requireAdminSession();
 if (session instanceof NextResponse) {
 return session;
 }

 const tenant = await getTenantById(session.tenantId);
 if (!tenant) {
 return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
 }

 return NextResponse.json({
 productName: tenant.branding.productName,
 productTagline: tenant.branding.productTagline,
 learnerTerm: tenant.branding.learnerTerm,
 learnerTermPlural: tenant.branding.learnerTermPlural,
 defaults: { productName: PRODUCT_NAME, productTagline: PRODUCT_TAGLINE, learnerTerm: DEFAULT_LEARNER_TERMS.one, learnerTermPlural: DEFAULT_LEARNER_TERMS.many },
 });
}

export async function PATCH(request: Request) {
 const session = await requireAdminSession();
 if (session instanceof NextResponse) {
 return session;
 }

 const parsed = updateSchema.safeParse(await request.json());
 if (!parsed.success) {
 return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 }

 try {
 const tenant = await updateTenantBranding(session.tenantId, parsed.data, session.user.id);
 return NextResponse.json({
 productName: tenant.branding.productName,
 productTagline: tenant.branding.productTagline,
 learnerTerm: tenant.branding.learnerTerm,
 learnerTermPlural: tenant.branding.learnerTermPlural,
 });
 } catch (error) {
 const message = error instanceof Error ? error.message : "Could not save branding.";
 return NextResponse.json({ error: message }, { status: 500 });
 }
}
