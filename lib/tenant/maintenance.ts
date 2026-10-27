import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_TENANT_ID } from "@/lib/tenant/types";

type MaintenanceState = { maintenanceMode: boolean; maintenanceMessage: string | null };

// Middleware asks on every request; maintenance is toggled rarely, so a short cache saves a round trip per click.
const MAINTENANCE_CACHE_TTL = 10_000;
const maintenanceCache = new Map<string, { value: MaintenanceState; loadedAt: number }>();

export async function getTenantMaintenanceState(tenantId: string | null): Promise<MaintenanceState> {
  const scoped = tenantId ?? DEFAULT_TENANT_ID;
  const cached = maintenanceCache.get(scoped);
  if (cached && Date.now() - cached.loadedAt < MAINTENANCE_CACHE_TTL) return cached.value;
  const value = await fetchMaintenanceState(tenantId);
  maintenanceCache.set(scoped, { value, loadedAt: Date.now() });
  return value;
}

async function fetchMaintenanceState(tenantId: string | null): Promise<MaintenanceState> {
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
