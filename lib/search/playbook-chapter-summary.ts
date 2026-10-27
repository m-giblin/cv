// Safe for client components: no server imports here.

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
