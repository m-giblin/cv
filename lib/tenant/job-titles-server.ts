import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { findJobTitle, normalizeJobTitles, type JobTitle } from "@/lib/tenant/job-titles";

/** The tenant's job titles; empty until the migration runs or an admin adds some. */
export async function loadJobTitles(admin: SupabaseClient, tenantId: string): Promise<JobTitle[]> {
  const { data, error } = await admin.from("tenants").select("job_titles").eq("id", tenantId).maybeSingle();
  if (error) return [];
  return normalizeJobTitles((data as { job_titles?: unknown } | null)?.job_titles);
}

/**
 * Resolves a job title an admin picked: null clears it, a known title comes back as itself, and
 * anything else is refused (the client never decides access on its own).
 */
export async function resolveJobTitle(admin: SupabaseClient, tenantId: string, name: string | null) {
  if (name === null || !name.trim()) return { title: null } as const;
  const title = findJobTitle(await loadJobTitles(admin, tenantId), name);
  return title ? ({ title } as const) : ({ error: `"${name}" isn't one of this tenant's job titles.` } as const);
}
