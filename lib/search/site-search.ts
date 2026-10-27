import type { SupabaseClient } from "@supabase/supabase-js";
import { SIM_DRAFT_MARKER } from "@/lib/admin/practice-library";
import { canAccessRoute, type AccessTier } from "@/lib/auth/rbac";
import { fetchPlansForUsers } from "@/lib/data/fetch-plans-bundle";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import type { Database } from "@/lib/database.types";
import { loadAssignablePeople } from "@/lib/playbooks/assignment-access";
import type { PlatformFeatureFlags } from "@/lib/platform/settings-shared";
import { SOURCE_LABEL, sourceKey } from "@/lib/question-bank/model";
import type { QuestionSourceKind } from "@/lib/question-bank/model";
import { loadPlaybookChapterSummaries, playbookChapterHref, type PlaybookChapterSummary } from "@/lib/search/playbook-chapters";
import { rankMatches } from "@/lib/search/match";
import type { ProfileRole } from "@/lib/types";

export type SearchGroupId = "playbooks" | "checks" | "simulations" | "pitch" | "library" | "ramp" | "people";

export type SearchResult = { id: string; title: string; detail?: string; href: string; external?: boolean };

export type SearchGroup = { id: SearchGroupId; label: string; results: SearchResult[] };

/** Group order in the palette, and the route each group needs the viewer to be able to open. */
export const SEARCH_GROUPS: { id: SearchGroupId; label: string; route: string }[] = [
  { id: "ramp", label: "Your ramp", route: "/my-plan" },
  { id: "playbooks", label: "Playbooks", route: "/learn/playbooks" },
  { id: "checks", label: "Knowledge checks", route: "/learn/knowledge-checks" },
  { id: "simulations", label: "Simulations", route: "/practice/simulations" },
  { id: "pitch", label: "Pitch practice", route: "/practice/pitch" },
  { id: "library", label: "Library", route: "/learn" },
  { id: "people", label: "People", route: "/manager/team" },
];

export const SEARCH_LIMIT = 5;

/** A knowledge check is offered once a source has this many approved questions (as on the checks page). */
const MIN_CHECK_QUESTIONS = 3;

type Viewer = {
  supabase: SupabaseClient<Database>;
  userId: string;
  tenantId: string;
  role: ProfileRole;
  tier: AccessTier;
  flags?: PlatformFeatureFlags;
};

/** Content and people matching `query`, grouped by type, at most SEARCH_LIMIT per group, all within one tenant. */
export async function searchSite(viewer: Viewer, query: string): Promise<SearchGroup[]> {
  const allowed = new Set(
    SEARCH_GROUPS.filter((group) => canAccessRoute(viewer.tier, group.route, viewer.flags)).map((group) => group.id),
  );
  // People results are for managers and admins only.
  if (!["manager", "admin", "super_admin"].includes(viewer.tier)) allowed.delete("people");

  const needChapters = allowed.has("playbooks") || allowed.has("checks");
  const chapters = needChapters ? loadPlaybookChapterSummaries(viewer.tenantId) : Promise.resolve([]);
  const found = await Promise.all([
    allowed.has("ramp") ? searchRamp(viewer, query) : [],
    allowed.has("playbooks") ? chapters.then((rows) => searchPlaybooks(rows, query)) : [],
    allowed.has("checks") ? chapters.then((rows) => searchChecks(viewer.tenantId, rows, query)) : [],
    allowed.has("simulations") ? searchSimulations(viewer.tenantId, query) : [],
    allowed.has("pitch") ? searchPitch(viewer.tenantId, query) : [],
    allowed.has("library") ? searchLibrary(viewer.tenantId, query) : [],
    allowed.has("people") ? searchPeople(viewer, query) : [],
  ]);
  return SEARCH_GROUPS.map((group, index) => ({ id: group.id, label: group.label, results: found[index] ?? [] })).filter(
    (group) => group.results.length > 0,
  );
}

function searchPlaybooks(chapters: PlaybookChapterSummary[], query: string): SearchResult[] {
  return rankMatches(query, chapters, (row) => ({ title: row.title, fields: [row.summary], keywords: ["playbook", "chapter"] }), SEARCH_LIMIT).map(
    (row) => ({ id: row.id, title: row.title, detail: `Chapter ${row.chapter}`, href: playbookChapterHref(row.slug) }),
  );
}

async function searchChecks(tenantId: string, chapters: PlaybookChapterSummary[], query: string): Promise<SearchResult[]> {
  const admin = getTenantAdminClient();
  if (!admin) return [];
  // Only the columns that make up a source key; the API returns at most 1000 rows a request.
  const rows: { source_kind: QuestionSourceKind; playbook_id: string | null; topic: string }[] = [];
  for (let from = 0; from < 10000; from += 1000) {
    const { data, error } = await admin
      .from("question_bank")
      .select("source_kind, playbook_id, topic")
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .order("id")
      .range(from, from + 999);
    if (error) return [];
    rows.push(...((data ?? []) as typeof rows));
    if ((data ?? []).length < 1000) break;
  }
  const chapterById = new Map(chapters.map((chapter) => [chapter.id, chapter]));
  const sources = new Map<string, { key: string; title: string; kind: QuestionSourceKind; summary: string; count: number }>();
  for (const row of rows) {
    const key = sourceKey({ sourceKind: row.source_kind, playbookId: row.playbook_id, topic: row.topic });
    const chapter = row.playbook_id ? chapterById.get(row.playbook_id) : undefined;
    const existing = sources.get(key) ?? {
      key,
      kind: row.source_kind,
      title: row.source_kind === "playbook" ? (chapter ? `Ch. ${chapter.chapter} ${chapter.title}` : "Playbook") : row.topic,
      summary: chapter?.summary ?? "",
      count: 0,
    };
    existing.count += 1;
    sources.set(key, existing);
  }
  const offered = [...sources.values()].filter((source) => source.count >= MIN_CHECK_QUESTIONS);
  return rankMatches(
    query,
    offered,
    (source) => ({ title: source.title, fields: [source.summary], keywords: ["knowledge check", "quiz", SOURCE_LABEL[source.kind]] }),
    SEARCH_LIMIT,
  ).map((source) => ({
    id: source.key,
    title: source.title,
    detail: `Knowledge check, ${SOURCE_LABEL[source.kind]}`,
    href: `/learn/knowledge-checks?source=${encodeURIComponent(source.key)}`,
  }));
}

async function searchSimulations(tenantId: string, query: string): Promise<SearchResult[]> {
  const admin = getTenantAdminClient();
  if (!admin) return [];
  const { data, error } = await admin
    .from("simulation_templates")
    .select("id, name, persona, vertical, solution_focus, difficulty")
    .eq("tenant_id", tenantId)
    // Drafts can't be opened yet.
    .not("prompt_body", "like", `${SIM_DRAFT_MARKER.trim()}%`)
    .order("name");
  if (error) return [];
  const rows = (data ?? []) as { id: string; name: string; persona: string | null; vertical: string | null; solution_focus: string | null; difficulty: string | null }[];
  return rankMatches(
    query,
    rows,
    (row) => ({ title: row.name, fields: [row.persona, row.solution_focus, row.vertical], keywords: ["simulation", "roleplay", "practice"] }),
    SEARCH_LIMIT,
  ).map((row) => ({
    id: row.id,
    title: row.name,
    detail: row.solution_focus ?? "Simulation",
    href: `/practice/simulations?template=${encodeURIComponent(row.id)}`,
  }));
}

async function searchPitch(tenantId: string, query: string): Promise<SearchResult[]> {
  const admin = getTenantAdminClient();
  if (!admin) return [];
  const { data, error } = await admin
    .from("pitch_scenario_templates")
    .select("id, label, short_label, description, linked_solution")
    .eq("tenant_id", tenantId)
    .eq("active", true)
    .order("sort_order");
  if (error) return [];
  const rows = (data ?? []) as { id: string; label: string; short_label: string | null; description: string | null; linked_solution: string | null }[];
  return rankMatches(
    query,
    rows,
    (row) => ({ title: row.label, fields: [row.short_label, row.description, row.linked_solution], keywords: ["pitch", "practice"] }),
    SEARCH_LIMIT,
  ).map((row) => ({
    id: row.id,
    title: row.label,
    detail: row.short_label ?? "Pitch",
    href: `/practice/pitch?scenario=${encodeURIComponent(row.id)}`,
  }));
}

async function searchLibrary(tenantId: string, query: string): Promise<SearchResult[]> {
  const admin = getTenantAdminClient();
  if (!admin) return [];
  const { data, error } = await admin
    .from("content_assets")
    .select("id, title, description, storage_path, project_tags, module_tags")
    .eq("tenant_id", tenantId)
    .order("title");
  if (error) return [];
  const rows = (data ?? []) as {
    id: string;
    title: string;
    description: string | null;
    storage_path: string;
    project_tags: string[] | null;
    module_tags: string[] | null;
  }[];
  return rankMatches(
    query,
    rows,
    (row) => ({
      title: row.title,
      fields: [row.description, ...(row.project_tags ?? []), ...(row.module_tags ?? [])],
      keywords: ["library", "asset", "resource"],
    }),
    SEARCH_LIMIT,
  ).map((row) => ({
    id: row.id,
    title: row.title,
    detail: (row.description ?? "Library").replaceAll("_", " "),
    href: row.storage_path,
    external: true,
  }));
}

async function searchRamp(viewer: Viewer, query: string): Promise<SearchResult[]> {
  // The viewer's own plan, read through their session.
  const plans = await fetchPlansForUsers(viewer.supabase, [viewer.userId], viewer.tenantId);
  const steps = plans.flatMap((plan) => plan.steps.map((step) => ({ step, plan: plan.name })));
  return rankMatches(
    query,
    steps,
    ({ step }) => ({ title: step.title, fields: [step.description], keywords: ["ramp", "step", "plan"] }),
    SEARCH_LIMIT,
  ).map(({ step, plan }) => ({
    id: step.assignmentStepId ?? step.id,
    title: step.title,
    detail: step.locked ? `${plan}, locked` : plan,
    href: `/my-plan?step=${encodeURIComponent(step.assignmentStepId ?? step.id)}`,
  }));
}

async function searchPeople(viewer: Viewer, query: string): Promise<SearchResult[]> {
  const people = await loadAssignablePeople(viewer.tenantId, viewer.userId, viewer.role);
  return rankMatches(query, people, (person) => ({ title: person.name ?? "", fields: [person.role.replaceAll("_", " ")] }), SEARCH_LIMIT).map(
    (person) => ({
      id: person.id,
      title: person.name,
      detail: person.role.replaceAll("_", " "),
      href: `/manager/team?profile=${encodeURIComponent(person.id)}`,
    }),
  );
}
