import { cache } from "react";
import { dashboardScopeForContext, resolveTenantContext } from "@/lib/auth/tenant-context";
import { getDemoDashboardData } from "@/lib/demo-data";
import { getAuthenticatedUser } from "@/lib/data/get-authenticated-user";
import { fetchTenantDashboard } from "@/lib/data/fetch-tenant-dashboard";
import { mapProfile } from "@/lib/data/get-dashboard-data";
import type { DataSource } from "@/lib/data/get-dashboard-data";
import type { DashboardData } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

async function fetchSupabaseDashboardPageData(): Promise<DashboardData | null> {
  const context = await resolveTenantContext();
  if (!context?.tenantId) {
    return null;
  }

  return fetchTenantDashboard(context.tenantId, context.userId, "personal", context.role);
}

export const getDashboardPageData = cache(async (): Promise<{ data: DashboardData; source: DataSource }> => {
  const authenticatedUser = await getAuthenticatedUser();

  try {
    const live = await fetchSupabaseDashboardPageData();
    if (live) {
      return { data: live, source: "supabase" };
    }
  } catch {
    // demo fallback
  }

  if (authenticatedUser) {
    const supabase = await createClient();
    const { data: profile } = supabase
      ? await supabase
          .from("profiles")
          .select("id, email, full_name, role, level, manager_id, avatar_url, created_at, tenant_id")
          .eq("id", authenticatedUser.id)
          .maybeSingle()
      : { data: null };

    if (profile) {
      const currentUser = mapProfile(profile);
      return {
        data: {
          currentUser,
          myOrg: [],
          profiles: [currentUser],
          plans: [],
          challenges: [],
          submissions: [],
          simulations: [],
          coachingCards: [],
          activity: [],
          competencies: [],
          notifications: [],
        },
        source: "supabase",
      };
    }
  }

  const demo = getDemoDashboardData();
  return { data: demo, source: "demo" };
});
