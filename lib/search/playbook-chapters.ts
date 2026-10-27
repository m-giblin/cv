import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";

/** A published playbook chapter, light enough to list and search (no body). */
export type PlaybookChapterSummary = {
  id: string;
  slug: string;
  chapter: number;
  title: string;
  /** The chapter's subtitle, e.g. "The foundation every other capability in this book runs on". */
  summary: string;
  updatedAt: string | null;
};

export function playbookChapterHref(slug: string) {
  return `/learn/playbooks?playbook=${encodeURIComponent(slug)}`;
}

/** Published chapters for one tenant, in chapter order. */
export async function loadPlaybookChapterSummaries(tenantId: string): Promise<PlaybookChapterSummary[]> {
  const admin = getTenantAdminClient();
  if (!admin) return [];
  const { data, error } = await admin
    .from("capability_playbooks")
    .select("id, slug, chapter, title, subtitle:body->>subtitle, updated_at")
    .eq("tenant_id", tenantId)
    .eq("status", "published")
    .order("chapter");
  if (error) return [];
  return ((data ?? []) as { id: string; slug: string; chapter: number; title: string; subtitle: string | null; updated_at: string | null }[]).map(
    (row) => ({
      id: row.id,
      slug: row.slug,
      chapter: row.chapter,
      title: row.title,
      summary: row.subtitle ?? "",
      updatedAt: row.updated_at,
    }),
  );
}
