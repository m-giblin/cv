import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdminSession } from "@/lib/auth/require-super-admin";
import { getTenantSsoConfig, updateTenantSsoConfig } from "@/lib/platform/tenant-sso";

const putSchema = z.object({
  enabled: z.boolean().optional(),
  provider: z.enum(["saml", "oidc"]).optional(),
  ssoDomain: z.string().max(255).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await requireSuperAdminSession();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;
  const config = await getTenantSsoConfig(id);
  return NextResponse.json({ sso: config });
}

export async function PUT(request: Request, context: RouteContext) {
  const session = await requireSuperAdminSession();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid SSO configuration payload." }, { status: 400 });
  }

  try {
    const config = await updateTenantSsoConfig(id, parsed.data, session.user.id);
    return NextResponse.json({ sso: config });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update SSO configuration." },
      { status: 500 },
    );
  }
}
