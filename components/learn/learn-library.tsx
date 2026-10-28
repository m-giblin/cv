"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CorpusFeedbackWidget } from "@/components/corpus/corpus-feedback-widget";
import { AssignWorkWizard } from "@/components/manager/assign-work-wizard";
import { Flag } from "lucide-react";
import { Chip } from "@/components/ui/chip";
import { Drawer } from "@/components/ui/drawer";
import { Note } from "@/components/ui/editorial";
import { FlightStrip } from "@/components/ui/flight-strip";
import { ProgressBlocks } from "@/components/ui/ramp-card";
import { StatusPill } from "@/components/ui/status-pill";
import { TableCard, tdCls, thCls } from "@/components/ui/table";
import type { LearnModule } from "@/lib/learn/agentic-curriculum";
import { scoreMatch } from "@/lib/search/match";
import { playbookChapterHref, type PlaybookChapterSummary } from "@/lib/search/playbook-chapter-summary";
import { canonicalSeHref } from "@/lib/se/se-routes";
import { formatShortDate, pad2 } from "@/lib/se/ramp-model";
import { cn } from "@/lib/utils";

type ContentAsset = {
  id: string;
  title: string;
  category: string;
  url: string;
  contentType: string | null;
  projectTags?: string[];
  moduleTags?: string[];
  updatedAt?: string | null;
};

type FilterId = "all" | "modules" | "battle" | "demo" | "one" | "playbook" | "lab" | "other";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "modules", label: "Modules" },
  { id: "battle", label: "Battle cards" },
  { id: "demo", label: "Demo guides" },
  { id: "one", label: "One-pagers" },
  { id: "playbook", label: "Playbooks" },
  { id: "lab", label: "ISC Lab" },
  // Everything without a type of its own (reference docs and the like), so All adds up.
  { id: "other", label: "Other" },
];

/** What "Start here" points at for someone on an active ramp: what their current step links to, or the playbook's first chapter. */
export type StartHerePick = {
  title: string;
  caption: string;
  href: string;
  external: boolean;
  /** Chapter number, shown in the strip's numeral. */
  numeral?: number;
  /** The ramp step this item belongs to. */
  stepHref?: string;
};

type LibraryItem = {
  id: string;
  kind: "module" | "asset" | "playbook";
  title: string;
  subline?: string;
  type: string;
  competency: string;
  updated: string;
  done?: boolean;
  href: string;
  external: boolean;
  filter: FilterId;
  module?: LearnModule;
};

function typeForCategory(category: string): { label: string; filter: FilterId } {
  const key = category.toLowerCase();
  if (key.includes("battle")) return { label: "Battle card", filter: "battle" };
  if (key.includes("demo")) return { label: "Demo guide", filter: "demo" };
  if (key.includes("one")) return { label: "One-pager", filter: "one" };
  if (key.includes("playbook")) return { label: "Playbook", filter: "playbook" };
  if (key.includes("lab")) return { label: "ISC Lab", filter: "lab" };
  return { label: category.replaceAll("_", " "), filter: "other" };
}

/**
 * Learn (artboard 6a): one searchable library. The learning path (GenAI vs Agentic AI modules,
 * progress from /api/learn/progress) comes first, then published playbook chapters, then every content
 * asset from /api/content.
 */
export function LearnLibrary({
  modules,
  playbooks = [],
  pathName,
  releaseProjectTags = [],
  labEnabled,
  rampPicks = 0,
  canAssign = false,
  startHere = null,
}: {
  modules: LearnModule[];
  /** Published playbook chapters; they open in Learn > Playbooks. */
  playbooks?: PlaybookChapterSummary[];
  /** Library items linked to the SE's open ramp steps. */
  rampPicks?: number;
  pathName: string;
  releaseProjectTags?: string[];
  labEnabled: boolean;
  /** Managers can assign any library item to people on their team. */
  canAssign?: boolean;
  /** Set for people on an active ramp; leads the rail instead of the module path. */
  startHere?: StartHerePick | null;
}) {
  const searchId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<ContentAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [projectTag, setProjectTag] = useState(releaseProjectTags[0] ?? "");
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [openModule, setOpenModule] = useState<LearnModule | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedbackAssetId, setFeedbackAssetId] = useState<string | null>(null);
  const [assignAssetId, setAssignAssetId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (projectTag) params.set("projectTag", projectTag);
    const response = await fetch(`/api/content?${params.toString()}`);
    if (response.ok) {
      const body = (await response.json()) as { assets: ContentAsset[] };
      setAssets(body.assets);
    }
    setLoading(false);
  }, [projectTag, search]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 200);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    void fetch("/api/learn/progress")
      .then((response) => (response.ok ? response.json() : { progress: [] }))
      .then((body: { progress?: { module_id: string }[] }) =>
        setCompleted(new Set((body.progress ?? []).map((row) => row.module_id))),
      )
      .catch(() => undefined);
  }, []);

  // "/" focuses search, unless the user is already typing somewhere.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const allItems = useMemo<LibraryItem[]>(() => {
    const query = search.trim().toLowerCase();
    const moduleItems: LibraryItem[] = modules
      .filter((module) => !query || `${module.title} ${module.summary}`.toLowerCase().includes(query))
      .map((module) => ({
        id: `module-${module.id}`,
        kind: "module",
        title: module.title,
        subline: `Module ${modules.indexOf(module) + 1} of ${modules.length}, ${pathName}`,
        type: "Module",
        competency: "Agentic AI",
        updated: "–",
        done: completed.has(module.id),
        href: "#",
        external: false,
        filter: "modules",
        module,
      }));
    const playbookItems: LibraryItem[] = playbooks
      .filter((playbook) => !query || scoreMatch(query, { title: playbook.title, fields: [playbook.summary] }) !== null)
      .map((playbook) => ({
        id: `playbook-${playbook.id}`,
        kind: "playbook",
        title: playbook.title,
        subline: playbook.summary || undefined,
        type: "Playbook",
        competency: `Chapter ${playbook.chapter}`,
        updated: formatShortDate(playbook.updatedAt) ?? "–",
        href: playbookChapterHref(playbook.slug),
        external: false,
        filter: "playbook",
      }));
    const assetItems: LibraryItem[] = assets.map((asset) => {
      const type = typeForCategory(asset.category);
      return {
        id: asset.id,
        kind: "asset",
        title: asset.title,
        type: type.label,
        competency: asset.moduleTags?.[0] ?? asset.projectTags?.[0] ?? "–",
        updated: formatShortDate(asset.updatedAt) ?? "–",
        href: asset.url,
        external: true,
        // ISC Lab items count as Other while the Lab (and its chip) is switched off.
        filter: type.filter === "lab" && !labEnabled ? "other" : type.filter,
      };
    });
    return [...moduleItems, ...playbookItems, ...assetItems];
  }, [assets, completed, labEnabled, modules, pathName, playbooks, search]);
  const items = useMemo(
    () => allItems.filter((item) => filter === "all" || item.filter === filter),
    [allItems, filter],
  );

  const nextModuleIndex = modules.findIndex((module) => !completed.has(module.id));
  const nextModule = nextModuleIndex >= 0 ? modules[nextModuleIndex] : null;
  // Progress can include modules from a track that's switched off, so count only the ones shown.
  const modulesDone = modules.filter((module) => completed.has(module.id)).length;
  const feedbackAsset = assets.find((asset) => asset.id === feedbackAssetId);

  async function markComplete(module: LearnModule) {
    setSaving(true);
    const response = await fetch("/api/learn/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleId: module.id }),
    });
    setSaving(false);
    if (!response.ok) {
      toast.error("Could not save progress.");
      return;
    }
    setCompleted((current) => new Set(current).add(module.id));
    setOpenModule(null);
    toast(`${module.title} marked complete`);
  }

  const counts = useMemo(() => {
    const result: Record<FilterId, number> = { all: 0, modules: 0, battle: 0, demo: 0, one: 0, playbook: 0, lab: 0, other: 0 };
    for (const item of allItems) {
      result.all += 1;
      result[item.filter] += 1;
    }
    return result;
  }, [allItems]);

  return (
    <div className="flex flex-col gap-[22px]">
      <form
        className="flex max-w-[760px] items-center gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void load();
          searchRef.current?.focus();
        }}
        role="search"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3 rounded-full border border-line-strong bg-white px-[22px] py-3 focus-within:border-blue focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue">
          <label className="sr-only" htmlFor={searchId}>
            Search the library
          </label>
          <input
            className="min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-muted focus-visible:outline-none"
            id={searchId}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search modules, playbooks, battle cards, demo guides"
            ref={searchRef}
            type="search"
            value={search}
          />
          <kbd aria-hidden className="rounded-[5px] border border-line px-1.5 text-xs text-muted">
            /
          </kbd>
        </div>
        <button className="btn-primary whitespace-nowrap" type="submit">
          Search
        </button>
      </form>

      <div className="grid items-start gap-[var(--rail-gap)] xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          {releaseProjectTags.length > 0 ? (
            <div aria-label="Your release training" className="flex flex-wrap items-center gap-2" role="group">
              <span className="label-caps mr-1">Your release training</span>
              {releaseProjectTags.map((tag) => (
                <Chip active={projectTag === tag} key={tag} onClick={() => setProjectTag((current) => (current === tag ? "" : tag))}>
                  {tag}
                </Chip>
              ))}
            </div>
          ) : null}

          <div aria-label="Filter by type" className="flex flex-wrap items-center gap-2" role="group">
            {FILTERS.filter((item) => (item.id !== "lab" || labEnabled) && (item.id !== "other" || counts.other > 0 || filter === "other")).map((item) => (
              <Chip active={filter === item.id} count={counts[item.id]} key={item.id} onClick={() => setFilter(item.id)}>
                {item.label}
              </Chip>
            ))}
            {labEnabled ? (
              <Link className="link ml-auto text-sm" href="/learn/lab">
                Ask the ISC Lab
              </Link>
            ) : null}
          </div>

          <p className="sr-only" role="status">
            {loading ? "Loading library" : `${items.length} items`}
          </p>
          <TableCard minWidth={640}>
            <caption className="sr-only">Library results</caption>
            <thead>
              <tr>
                <th className={thCls} scope="col">
                  Title
                </th>
                <th className={cn(thCls, "w-[130px]")} scope="col">
                  Type
                </th>
                <th className={cn(thCls, "w-[170px]")} scope="col">
                  Competency
                </th>
                <th className={cn(thCls, "w-[100px] text-right")} scope="col">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-center text-[15px] text-muted" colSpan={4}>
                    Loading the library…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-center text-[15px] text-muted" colSpan={4}>
                    Nothing matches that search.
                  </td>
                </tr>
              ) : (
                items.map((item, index) => {
                  const cell = cn(tdCls, index === 0 && "border-t-0");
                  return (
                    <tr key={item.id}>
                      <th className={cn(cell, "font-normal")} scope="row">
                        <span className="flex min-w-0 items-start gap-2">
                          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            {item.kind === "module" ? (
                              <button
                                className="truncate text-left text-[15px] font-bold text-ink hover:underline hover:decoration-signal hover:decoration-2 hover:underline-offset-4"
                                onClick={() => setOpenModule(item.module!)}
                                type="button"
                              >
                                {item.title}
                              </button>
                            ) : item.kind === "playbook" ? (
                              <Link
                                className="truncate text-[15px] font-bold text-ink hover:underline hover:decoration-signal hover:decoration-2 hover:underline-offset-4"
                                href={item.href}
                              >
                                {item.title}
                              </Link>
                            ) : (
                              <a
                                className="truncate text-[15px] font-bold text-ink hover:underline hover:decoration-signal hover:decoration-2 hover:underline-offset-4"
                                href={item.href}
                                rel="noreferrer"
                                target="_blank"
                              >
                                {item.title}
                                <span className="sr-only"> (opens in a new tab)</span>
                              </a>
                            )}
                            {item.subline ? <span className="truncate text-[13px] text-muted">{item.subline}</span> : null}
                          </span>
                          {item.kind === "asset" && canAssign ? (
                            <button
                              aria-haspopup="dialog"
                              aria-label={`Assign ${item.title} to your team`}
                              className="link mt-0.5 shrink-0 text-[13px]"
                              onClick={() => setAssignAssetId(item.id)}
                              type="button"
                            >
                              Assign
                            </button>
                          ) : null}
                          {item.kind === "asset" ? (
                            <button
                              aria-haspopup="dialog"
                              aria-label={`Report a problem with ${item.title}`}
                              className="mt-0.5 shrink-0 rounded-full p-1 text-muted hover:text-ink"
                              onClick={() => setFeedbackAssetId(item.id)}
                              title="Report a problem"
                              type="button"
                            >
                              <Flag aria-hidden className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </span>
                      </th>
                      <td className={cn(cell, "text-sm text-ink-2")}>{item.type}</td>
                      <td className={cn(cell, "truncate text-sm text-ink-2")}>{item.competency}</td>
                      <td className={cn(cell, "text-right text-sm text-muted")}>
                        {item.done ? <StatusPill tone="success">Done</StatusPill> : item.updated}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </TableCard>
        </div>

        <aside aria-label="Your learning" className="flex min-w-0 flex-col gap-3.5">
          {startHere ? (
            <>
              <h2 className="label-caps">Start here</h2>
              <FlightStrip
                compact
                numeral={startHere.numeral ? pad2(startHere.numeral) : "→"}
                numeralCaption={startHere.numeral ? "Chapter" : "Ramp"}
                stubLabel={startHere.numeral ? "Playbook" : "Your ramp"}
              >
                <h3 className="text-lg leading-[1.2] font-extrabold text-ink">{startHere.title}</h3>
                <span className="text-[13px] text-muted">{startHere.caption}</span>
                <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  {startHere.external ? (
                    <a className="link self-start text-sm" href={startHere.href} rel="noreferrer" target="_blank">
                      Open
                      <span className="sr-only"> {startHere.title} (opens in a new tab)</span>
                    </a>
                  ) : (
                    <Link className="link self-start text-sm" href={startHere.href}>
                      Start
                    </Link>
                  )}
                  {startHere.stepHref ? (
                    <Link className="link self-start text-sm" href={startHere.stepHref}>
                      Go to the step
                    </Link>
                  ) : null}
                </span>
              </FlightStrip>
            </>
          ) : modules.length > 0 ? (
            <>
              <h2 className="label-caps">
                {/* Only "continue" once the person has actually finished a module. */}
                {nextModule ? (modulesDone > 0 ? "Continue where you left off" : "Start here") : "Learning path"}
              </h2>
              <FlightStrip
                compact
                numeral={pad2(nextModule ? nextModuleIndex + 1 : modules.length)}
                numeralCaption={`of ${modules.length}`}
                stubLabel="Module"
              >
                <h3 className="text-lg leading-[1.2] font-extrabold text-ink">
                  {nextModule ? nextModule.title : "You've finished this learning path"}
                </h3>
                <span className="text-[13px] text-muted">
                  {pathName}, {modulesDone} of {modules.length} done
                </span>
                <ProgressBlocks done={modulesDone} total={modules.length} />
                {nextModule ? (
                  <button className="link self-start text-sm" onClick={() => setOpenModule(nextModule)} type="button">
                    {modulesDone > 0 ? "Resume" : "Start"}
                  </button>
                ) : null}
              </FlightStrip>
            </>
          ) : null}
          <Note title="Picked for your ramp">
            {rampPicks > 0
              ? `${rampPicks} ${rampPicks === 1 ? "item is" : "items are"} linked to your open ramp steps. They open next to the step while you work on it.`
              : "When a ramp step links to something in the library, it opens next to the step while you work on it."}
          </Note>
        </aside>
      </div>

      <Drawer
        footer={
          openModule ? (
            completed.has(openModule.id) ? (
              <Link className="btn-primary" href={canonicalSeHref(openModule.href)}>
                Practice this
              </Link>
            ) : (
              <>
                <button className="btn-primary" disabled={saving} onClick={() => void markComplete(openModule)} type="button">
                  {saving ? "Saving…" : "Mark complete"}
                </button>
                <Link className="btn-secondary" href={canonicalSeHref(openModule.href)}>
                  Practice this
                </Link>
              </>
            )
          ) : undefined
        }
        onClose={() => setOpenModule(null)}
        open={Boolean(openModule)}
        title={openModule?.title ?? ""}
      >
        {openModule ? (
          <div className="flex flex-col gap-4 text-[15px] leading-[1.5] text-ink-2">
            <p className="text-sm text-muted">
              Module in {pathName}.{completed.has(openModule.id) ? " You've completed it." : ""}
            </p>
            <p className="text-ink">{openModule.summary}</p>
            <ul className="flex list-disc flex-col gap-2 pl-5 marker:text-blue">
              {openModule.topics.map((topic) => (
                <li key={topic}>{topic}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </Drawer>

      <Drawer
        eyebrow="Report a problem"
        onClose={() => setFeedbackAssetId(null)}
        open={Boolean(feedbackAsset)}
        size="form"
        title={feedbackAsset?.title ?? ""}
      >
        {feedbackAsset ? <CorpusFeedbackWidget assetTitle={feedbackAsset.title} contentAssetId={feedbackAsset.id} /> : null}
      </Drawer>

      {assignAssetId ? (
        <AssignWorkWizard
          defaultKind="content"
          defaultPicked={[assignAssetId]}
          onAssigned={() => setAssignAssetId(null)}
          onCancel={() => setAssignAssetId(null)}
        />
      ) : null}
    </div>
  );
}
