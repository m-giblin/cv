import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdminSession } from "@/lib/auth/require-super-admin";
import { createTenantWebhook, deleteTenantWebhook, listTenantWebhooks } from "@/lib/platform/tenant-webhooks";

const createSchema = z.object({
  url: z.string().url(),
  secret: z.string().min(8).max(500).optional(),
  events: z.array(z.string().min(1)).min(1),
  enabled: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await requireSuperAdminSession();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;
  const webhooks = await listTenantWebhooks(id);
  return NextResponse.json({ webhooks });
}

export async function POST(request: Request, context: RouteContext) {
  const session = await requireSuperAdminSession();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  try {
    const webhook = await createTenantWebhook(id, parsed.data, session.user.id);
    return NextResponse.json({ webhook }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create webhook." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const session = await requireSuperAdminSession();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const webhookId = searchParams.get("webhookId");

  if (!webhookId) {
    return NextResponse.json({ error: "webhookId query param is required." }, { status: 400 });
  }

  try {
    await deleteTenantWebhook(id, webhookId, session.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete webhook." },
      { status: 500 },
    );
  }
}
