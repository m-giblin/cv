import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import type { PlaybookChapterSummary } from "@/lib/search/playbook-chapter-summary";

export { playbookChapterHref, type PlaybookChapterSummary } from "@/lib/search/playbook-chapter-summary";

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

/** A chapter plus the short parts of its body that say what it covers, for site search. */
export type PlaybookChapterSearchRow = PlaybookChapterSummary & { coverage: string };

/**
 * Like loadPlaybookChapterSummaries, plus the chapter's "where it fits" line, objectives, preview and
 * takeaways, so a search for a concept the chapter teaches ("access profile") finds it. Only those
 * short fields are read, never the whole body.
 */
export async function loadPlaybookChapterSearchRows(tenantId: string): Promise<PlaybookChapterSearchRow[]> {
  const admin = getTenantAdminClient();
  if (!admin) return [];
  const { data, error } = await admin
    .from("capability_playbooks")
    .select(
      "id, slug, chapter, title, subtitle:body->>subtitle, where_fits:body->>whereFits, objectives:body->objectives, preview:body->preview, takeaways:body->takeaways, updated_at",
    )
    .eq("tenant_id", tenantId)
    .eq("status", "published")
    .order("chapter");
  if (error) return [];
  const lines = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);
  return (
    (data ?? []) as {
      id: string;
      slug: string;
      chapter: number;
      title: string;
      subtitle: string | null;
      where_fits: string | null;
      objectives: unknown;
      preview: unknown;
      takeaways: unknown;
      updated_at: string | null;
    }[]
  ).map((row) => ({
    id: row.id,
    slug: row.slug,
    chapter: row.chapter,
    title: row.title,
    summary: row.subtitle ?? "",
    updatedAt: row.updated_at,
    coverage: [row.where_fits ?? "", ...lines(row.objectives), ...lines(row.preview), ...lines(row.takeaways)].join(" "),
  }));
}
