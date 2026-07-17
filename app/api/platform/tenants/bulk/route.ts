import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuditEvent } from "@/lib/audit/log-admin-action";
import {
  applyFeatureFlagPreset,
  billingPlanForPreset,
  type FeatureFlagPresetId,
} from "@/lib/platform/flag-presets";
import { requireSuperAdminSession } from "@/lib/auth/require-super-admin";
import { updateTenantCommercial, updateTenantFeatureFlags, updateTenantStatus } from "@/lib/tenant/tenants";

const bulkSchema = z.object({
  tenantIds: z.array(z.string().uuid()).min(1).max(50),
  action: z.enum(["suspend", "activate", "apply_preset"]),
  presetId: z.enum(["full", "se-only", "ae-pilot", "manager-lite"]).optional(),
});

export async function POST(request: Request) {
  const session = await requireSuperAdminSession();
  if (session instanceof NextResponse) return session;

  const parsed = bulkSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { tenantIds, action, presetId } = parsed.data;
  if (action === "apply_preset" && !presetId) {
    return NextResponse.json({ error: "presetId required for apply_preset." }, { status: 400 });
  }

  const results: Array<{ tenantId: string; ok: boolean; error?: string }> = [];

  for (const tenantId of tenantIds) {
    try {
      if (action === "suspend") {
        await updateTenantStatus(tenantId, "suspended", session.user.id);
      } else if (action === "activate") {
        await updateTenantStatus(tenantId, "active", session.user.id);
      } else if (action === "apply_preset" && presetId) {
        const flags = applyFeatureFlagPreset(presetId as FeatureFlagPresetId);
        await updateTenantFeatureFlags(tenantId, session.user.id, flags);
        await updateTenantCommercial(
          tenantId,
          { billingPlan: billingPlanForPreset(presetId as FeatureFlagPresetId) },
          session.user.id,
        );
      }
      results.push({ tenantId, ok: true });
    } catch (error) {
      results.push({
        tenantId,
        ok: false,
        error: error instanceof Error ? error.message : "Failed",
      });
    }
  }

  await requireAuditEvent(session.user.id, {
    action: "tenant.bulk_operation",
    targetType: "tenant_bulk",
    details: {
      action,
      presetId: presetId ?? null,
      tenantIds,
      okCount: results.filter((row) => row.ok).length,
      failCount: results.filter((row) => !row.ok).length,
      results,
    },
  });

  return NextResponse.json({ results });
}
