import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_TENANT_ID } from "@/lib/tenant/types";

export async function getTenantMaintenanceState(tenantId: string | null): Promise<{
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
}> {
  const admin = createAdminClient();
  if (!admin) return { maintenanceMode: false, maintenanceMessage: null };

  const scopedId = tenantId ?? DEFAULT_TENANT_ID;
  const { data } = await admin
    .from("tenants")
    .select("maintenance_mode, maintenance_message")
    .eq("id", scopedId)
    .maybeSingle();

  return {
    maintenanceMode: data?.maintenance_mode ?? false,
    maintenanceMessage: data?.maintenance_message ?? null,
  };
}
