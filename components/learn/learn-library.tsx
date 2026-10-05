"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CorpusFeedbackWidget } from "@/components/corpus/corpus-feedback-widget";
import { FlightStrip } from "@/components/ui/flight-strip";
import { Chip } from "@/components/ui/chip";
import { Drawer } from "@/components/ui/drawer";
import { Tag } from "@/components/ui/tag";
import type { LearnModule } from "@/lib/learn/agentic-curriculum";
import { canonicalSeHref } from "@/lib/se/se-routes";
import { formatShortDate } from "@/lib/se/ramp-model";
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

type FilterId = "all" | "modules" | "battle" | "demo" | "one" | "playbook" | "lab";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "modules", label: "Modules" },
  { id: "battle", label: "Battle cards" },
  { id: "demo", label: "Demo guides" },
  { id: "one", label: "One-pagers" },
  { id: "playbook", label: "Playbooks" },
  { id: "lab", label: "ISC Lab" },
];

type LibraryItem = {
  id: string;
  kind: "module" | "asset";
  title: string;
  type: string;
  competency: string;
  updated: string;
  href: string;
  external: boolean;
  filter: FilterId | null;
  module?: LearnModule;
};

function typeForCategory(category: string): { label: string; filter: FilterId | null } {
  const key = category.toLowerCase();
  if (key.includes("battle")) return { label: "Battle card", filter: "battle" };
  if (key.includes("demo")) return { label: "Demo guide", filter: "demo" };
  if (key.includes("one")) return { label: "One-pager", filter: "one" };
  if (key.includes("playbook")) return { label: "Playbook", filter: "playbook" };
  if (key.includes("lab")) return { label: "ISC Lab", filter: "lab" };
  return { label: category.replaceAll("_", " "), filter: null };
}

/**
 * Learn (artboard 6a): one searchable library. The learning path (GenAI vs Agentic AI modules,
 * progress from /api/learn/progress) comes first, then every content asset from /api/content.
 */
export function LearnLibrary({
  modules,
  pathName,
  releaseProjectTags = [],
  labEnabled,
}: {
  modules: LearnModule[];
  pathName: string;
  releaseProjectTags?: string[];
  labEnabled: boolean;
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

  const items = useMemo<LibraryItem[]>(() => {
    const query = search.trim().toLowerCase();
    const moduleItems: LibraryItem[] = modules
      .filter((module) => !query || `${module.title} ${module.summary}`.toLowerCase().includes(query))
      .map((module) => ({
        id: `module-${module.id}`,
        kind: "module",
        title: module.title,
        type: "Module",
        competency: "Agentic AI",
        updated: completed.has(module.id) ? "✓ DONE" : "—",
        href: "#",
        external: false,
        filter: "modules",
        module,
      }));
    const assetItems: LibraryItem[] = assets.map((asset) => {
      const type = typeForCategory(asset.category);
      return {
        id: asset.id,
        kind: "asset",
        title: asset.title,
        type: type.label,
        competency: asset.moduleTags?.[0] ?? asset.projectTags?.[0] ?? "—",
        updated: formatShortDate(asset.updatedAt) ?? "—",
        href: asset.url,
        external: true,
        filter: type.filter,
      };
    });
    return [...moduleItems, ...assetItems].filter((item) => filter === "all" || item.filter === filter);
  }, [assets, completed, filter, modules, search]);

  const nextModuleIndex = modules.findIndex((module) => !completed.has(module.id));
  const nextModule = nextModuleIndex >= 0 ? modules[nextModuleIndex] : null;
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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex max-w-[720px] items-center gap-3 rounded-full border-[1.5px] border-ink bg-white px-5 py-[11px] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue">
        <label className="sr-only" htmlFor={searchId}>
          Search the library
        </label>
        <input
          className="min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder:text-muted focus-visible:outline-none"
          id={searchId}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search battle cards, demo guides, modules…"
          ref={searchRef}
          type="search"
          value={search}
        />
        <kbd aria-hidden className="rounded-[6px] border border-line-strong px-[7px] py-px font-mono text-xs text-muted">
          /
        </kbd>
      </div>

      {modules.length > 0 ? (
        <FlightStrip
          compact={false}
          numeral={String(nextModule ? nextModuleIndex + 1 : modules.length).padStart(2, "0")}
          stubLabel={`OF ${String(modules.length).padStart(2, "0")}`}
        >
          <span className="font-mono text-xs text-muted uppercase">
            {nextModule ? "Continue" : "Complete"} · learning path · {pathName}
          </span>
          <h2 className="text-[22px] leading-[1.15] font-extrabold tracking-[-0.01em] text-ink">
            {nextModule ? nextModule.title : "You've finished this learning path"}
          </h2>
          <div className="mt-0.5 flex flex-wrap items-center gap-4">
            {nextModule ? (
              <button className="btn-primary" onClick={() => setOpenModule(nextModule)} type="button">
                {completed.size > 0 ? "Resume" : "Start"}
              </button>
            ) : null}
            <span aria-label={`${completed.size} of ${modules.length} modules complete`} className="flex w-[180px] gap-1" role="img">
              {modules.map((module, index) => (
                <span
                  className={cn(
                    "h-2 flex-1 rounded-[2px]",
                    completed.has(module.id)
                      ? "bg-blue"
                      : index === nextModuleIndex
                        ? "bg-signal outline-[1.5px] outline-ink"
                        : "bg-[#DCE2EC]",
                  )}
                  key={module.id}
                />
              ))}
            </span>
          </div>
        </FlightStrip>
      ) : null}

      {releaseProjectTags.length > 0 ? (
        <div aria-label="Your release training" className="flex flex-wrap items-center gap-1.5" role="group">
          <span className="label-mono mr-1.5">Your release training</span>
          {releaseProjectTags.map((tag) => (
            <Chip active={projectTag === tag} key={tag} onClick={() => setProjectTag((current) => (current === tag ? "" : tag))}>
              {tag}
            </Chip>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-2.5">
        <div aria-label="Filter by type" className="flex flex-wrap gap-1.5" role="group">
          {FILTERS.filter((item) => item.id !== "lab" || labEnabled).map((item) => (
            <Chip active={filter === item.id} key={item.id} onClick={() => setFilter(item.id)}>
              {item.label}
            </Chip>
          ))}
          {labEnabled ? (
            <Link className="link ml-auto self-center text-sm" href="/learn/lab">
              Ask the ISC Lab
            </Link>
          ) : null}
        </div>

        <div className="overflow-x-auto rounded-[14px] border border-line bg-white">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[minmax(0,1fr)_150px_190px_90px] gap-4 border-b border-line px-5 py-2.5 font-mono text-xs font-medium text-muted uppercase">
              <span>Title</span>
              <span>Type</span>
              <span>Competency</span>
              <span className="text-right">Updated</span>
            </div>
            <p className="sr-only" role="status">
              {loading ? "Loading library" : `${items.length} items`}
            </p>
            {loading && items.length === 0 ? (
              <p className="px-5 py-8 text-center text-[15px] text-muted">Loading the library…</p>
            ) : items.length === 0 ? (
              <p className="px-5 py-8 text-center text-[15px] text-muted">Nothing matches that search.</p>
            ) : (
              <ul>
                {items.map((item) => (
                  <li
                    className="grid grid-cols-[minmax(0,1fr)_150px_190px_90px] items-center gap-4 border-b border-divider px-5 py-[13px] text-[15px] last:border-b-0"
                    key={item.id}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {item.kind === "module" ? (
                        <button className="link truncate text-left text-[15px]" onClick={() => setOpenModule(item.module!)} type="button">
                          {item.title}
                        </button>
                      ) : (
                        <a className="link truncate text-[15px]" href={item.href} rel="noreferrer" target="_blank">
                          {item.title}
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      )}
                      {item.kind === "asset" ? (
                        <button
                          aria-expanded={feedbackAssetId === item.id}
                          className="shrink-0 rounded-full px-1.5 font-mono text-xs text-muted hover:text-ink"
                          onClick={() => setFeedbackAssetId((current) => (current === item.id ? null : item.id))}
                          type="button"
                        >
                          ?<span className="sr-only">Report a problem with {item.title}</span>
                        </button>
                      ) : null}
                    </span>
                    <span>
                      <Tag>{item.type}</Tag>
                    </span>
                    <span className="truncate text-ink-2">{item.competency}</span>
                    <span className="text-right font-mono text-xs text-muted uppercase">{item.updated}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {feedbackAsset ? <CorpusFeedbackWidget assetTitle={feedbackAsset.title} contentAssetId={feedbackAsset.id} /> : null}
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
            <p className="label-mono">
              Module · {pathName}
              {completed.has(openModule.id) ? " · ✓ complete" : ""}
            </p>
            <p className="text-ink">{openModule.summary}</p>
            <ul className="flex flex-col gap-2">
              {openModule.topics.map((topic) => (
                <li className="flex gap-2" key={topic}>
                  <span aria-hidden className="text-blue">
                    →
                  </span>
                  {topic}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
