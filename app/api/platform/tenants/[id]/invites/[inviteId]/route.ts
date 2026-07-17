import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdminSession } from "@/lib/auth/require-super-admin";
import { resendTenantInvite, revokeTenantInvite } from "@/lib/platform/tenant-invites";

const actionSchema = z.object({
  action: z.enum(["revoke", "resend"]),
});

type RouteContext = { params: Promise<{ id: string; inviteId: string }> };

async function handleInviteAction(request: Request, context: RouteContext) {
  const session = await requireSuperAdminSession();
  if (session instanceof NextResponse) return session;

  const { id: tenantId, inviteId } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "action must be 'revoke' or 'resend'." }, { status: 400 });
  }

  try {
    const invite =
      parsed.data.action === "revoke"
        ? await revokeTenantInvite(inviteId, session.user.id)
        : await resendTenantInvite(inviteId, session.user.id);

    if (invite.tenantId !== tenantId) {
      return NextResponse.json({ error: "Invite does not belong to this tenant." }, { status: 404 });
    }

    return NextResponse.json({ invite });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update invite." },
      { status: 500 },
    );
  }
}

export const PATCH = handleInviteAction;
export const POST = handleInviteAction;
