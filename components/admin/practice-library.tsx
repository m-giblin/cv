"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState, LinkButton, LoadingState } from "@/components/admin/admin-ui";
import { PitchScenarioEditor, SimTemplateEditor } from "@/components/admin/practice-editors";
import { PracticeAssignDialog } from "@/components/admin/practice-assign-dialog";
import { PracticeWizard, type PublishedPractice } from "@/components/admin/practice-wizard";
import { Note } from "@/components/ui/editorial";
import { FlightStrip } from "@/components/ui/flight-strip";
import { Chip } from "@/components/ui/chip";
import { DataTablePagination, paginate } from "@/components/ui/data-table";
import { StatusPill } from "@/components/ui/status-pill";
import { FilterBar, TableCard, TwoLineCell, rowHighlight, tdCls, thCls } from "@/components/ui/table";
import { Tag } from "@/components/ui/tag";
import {
  DEFAULT_PRACTICE_FILTERS,
  FALLBACK_COMPETENCIES,
  PRACTICE_VERTICALS,
  filterPractice,
  filterPracticeBase,
  formatShortDate,
  isDynamicPersona,
  managerOverrides,
  pitchToItem,
  practiceStatusCounts,
  simToItem,
  sortPractice,
  trackLabel,
  type PitchScenarioRow,
  type PracticeFilters,
  type PracticeItem,
  type PracticeSort,
  type PracticeUsage,
  type SimTemplateRow,
} from "@/lib/admin/practice-library";
import type { AiUsageSummary } from "@/lib/ai/settings-shared";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

const PROVIDER_LABEL: Record<string, string> = { xai: "xAI", openai: "OpenAI" };

function PillSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="relative inline-flex">
      <span className="sr-only">{label}</span>
      <select
        className={cn(
          "cursor-pointer appearance-none rounded-full border bg-white py-[7px] pr-8 pl-3.5 text-sm font-semibold text-ink",
          value ? "border-ink" : "border-line hover:border-line-strong",
        )}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">{label}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {label}: {option.label}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2 text-ink" />
    </label>
  );
}

const PAGE_SIZE = 10;

function rounds(value: number): string {
  return value === 0 ? "No practice rounds" : value === 1 ? "One practice round" : `${value} practice rounds`;
}

/**
 * Content › Practice (handoff 15a): one library for simulation templates and pitch scenarios, with the
 * "As the SE sees it" rail and the New practice wizard. Provider settings live in Settings › AI.
 */
export function PracticeLibrary({
  people,
  usage,
  aiUsage,
}: {
  people: Profile[];
  usage: PracticeUsage | null;
  aiUsage: AiUsageSummary | null;
}) {
  const router = useRouter();
  const [sims, setSims] = useState<SimTemplateRow[] | null>(null);
  const [pitches, setPitches] = useState<PitchScenarioRow[] | null>(null);
  const [competencies, setCompetencies] = useState<string[]>([]);
  const [filters, setFilters] = useState<PracticeFilters>(DEFAULT_PRACTICE_FILTERS);
  const [sort, setSort] = useState<PracticeSort>("used");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [wizardOpen, setWizardOpen] = useState(false);
  const [duplicateOf, setDuplicateOf] = useState<PracticeItem | null>(null);
  const [assigning, setAssigning] = useState<PracticeItem | null>(null);
  const [editing, setEditing] = useState<PracticeItem | null>(null);
  const [page, setPage] = useState(1);
  const [lastPublished, setLastPublished] = useState<PublishedPractice | null>(null);

  const load = useCallback(async () => {
    const [simResponse, pitchResponse] = await Promise.all([
      fetch("/api/admin/simulation-templates").catch(() => null),
      fetch("/api/admin/pitch-scenarios").catch(() => null),
    ]);
    let nextSims: SimTemplateRow[] = [];
    let nextPitches: PitchScenarioRow[] = [];
    if (simResponse?.ok) nextSims = ((await simResponse.json()) as { templates?: SimTemplateRow[] }).templates ?? [];
    else toast.error("Could not load simulations.");
    if (pitchResponse?.ok) nextPitches = ((await pitchResponse.json()) as { scenarios?: PitchScenarioRow[] }).scenarios ?? [];
    else toast.error("Could not load pitch scenarios.");
    setSims(nextSims);
    setPitches(nextPitches);
    return { sims: nextSims, pitches: nextPitches };
  }, []);

  useEffect(() => {
    void load();
    void (async () => {
      const response = await fetch("/api/admin/competencies").catch(() => null);
      const names = response?.ok
        ? (((await response.json()) as { competencies?: { name: string }[] }).competencies ?? []).map((entry) => entry.name)
        : [];
      setCompetencies(names.length ? names : FALLBACK_COMPETENCIES);
    })();
  }, [load]);

  const items = useMemo(
    () => [...(sims ?? []).map((row) => simToItem(row, usage)), ...(pitches ?? []).map((row) => pitchToItem(row, usage))],
    [pitches, sims, usage],
  );
  const base = filterPracticeBase(items, filters);
  const counts = practiceStatusCounts(base);
  const visible = useMemo(() => {
    const sorted = sortPractice(filterPractice(items, filters), sort);
    // Freshly published items sit at the top of the list.
    return [...sorted.filter((item) => fresh.has(item.key)), ...sorted.filter((item) => !fresh.has(item.key))];
  }, [filters, fresh, items, sort]);

  // Filters or sort send the list back to page one.
  useEffect(() => setPage(1), [filters, sort]);
  const paged = paginate(visible, page, PAGE_SIZE);

  const selected = visible.find((item) => item.key === selectedKey) ?? paged.rows[0] ?? null;
  const loading = sims === null || pitches === null;
  const verticalOptions = [...new Set([...PRACTICE_VERTICALS, ...items.map((item) => item.vertical)])];
  const competencyOptions = [...new Set([...competencies, ...items.flatMap((item) => item.competencies)])];

  function openItem(item: PracticeItem) {
    setSelectedKey(item.key);
    setEditing(item);
  }

  function openNew() {
    setDuplicateOf(null);
    setWizardOpen(true);
  }

  async function onPublished(item: PublishedPractice) {
    setLastPublished(item);
    const loaded = await load();
    let key = item.id ? `${item.kind}-${item.id}` : null;
    if (!key) {
      // Older API responses carry no id: find the newest item with this name.
      const match =
        item.kind === "sim"
          ? [...loaded.sims].filter((row) => row.name === item.name).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
          : loaded.pitches.find((row) => row.label === item.name);
      key = match ? `${item.kind}-${match.id}` : null;
    }
    if (key) {
      setFresh((current) => new Set(current).add(key!));
      setSelectedKey(key);
    }
    setFilters(DEFAULT_PRACTICE_FILTERS);
  }

  function onWizardNext(index: 0 | 1 | 2) {
    setWizardOpen(false);
    const published = lastPublished;
    if (!published) return;
    if (index === 0) {
      const params = new URLSearchParams({ addPractice: `${published.kind}:${published.id}`, title: published.name });
      router.push(`/admin/programs?${params.toString()}`);
      return;
    }
    if (index === 1) {
      const item = items.find((entry) => entry.key === `${published.kind}-${published.id}`);
      if (item?.sim) setAssigning(item);
      else toast.error("Could not find the new simulation. Pick it in the list and choose Assign to SEs.");
    }
  }

  async function setPitchActive(item: PracticeItem, active: boolean) {
    const row = item.pitch;
    if (!row) return;
    const response = active
      ? await fetch(`/api/admin/pitch-scenarios/${row.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: row.slug,
            track: row.track,
            shortLabel: row.shortLabel,
            label: row.label,
            promptLabel: row.promptLabel,
            prompt: row.prompt,
            description: row.description,
            competencies: row.competencies,
            linkedSolution: row.linkedSolution,
            maxDurationSec: row.maxDurationSec,
            sortOrder: row.sortOrder,
            passingGrade: row.passingGrade,
            active: true,
          }),
        })
      : window.confirm(`Take "${row.label}" out of SE pitch queues? You can make it live again later.`)
        ? await fetch(`/api/admin/pitch-scenarios/${row.id}`, { method: "DELETE" })
        : null;
    if (!response) return;
    if (!response.ok) {
      toast.error("Could not update the scenario.");
      return;
    }
    toast.success(active ? `${row.label} is live.` : `${row.label} is now a draft.`);
    await load();
  }

  async function deleteSim(item: PracticeItem) {
    if (!item.sim) return;
    if (!window.confirm(`Delete "${item.name}"? Managers will no longer be able to assign it.`)) return;
    const response = await fetch(`/api/admin/simulation-templates/${item.sim.id}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("Could not delete the simulation.");
      return;
    }
    toast.success(`${item.name} deleted.`);
    setSelectedKey(null);
    await load();
  }

  const definitions: { term: string; value: string }[] = selected
    ? selected.sim
      ? [
          { term: "Buyer", value: isDynamicPersona(selected.sim.persona) ? "Generated each run" : selected.sim.persona },
          { term: "Counts toward", value: selected.competencies[0] ?? "Not set" },
          {
            term: "Managers can change",
            value: (() => {
              const list = managerOverrides(selected.sim.promptBody);
              return list.length ? list.join(", ") : "Nothing";
            })(),
          },
          { term: "Last edited", value: formatShortDate(selected.updatedAt) },
        ]
      : [
          { term: "Track", value: trackLabel(selected.pitch?.track ?? "") },
          { term: "Counts toward", value: selected.competencies.join(", ") || "Not set" },
          { term: "Time limit", value: `${selected.duration.value} seconds` },
          { term: "Last edited", value: formatShortDate(selected.updatedAt) },
        ]
    : [];

  const seView = selected ? (
    <>
      <FlightStrip
        compact
        numeral={selected.duration.value}
        numeralCaption={selected.duration.unit}
        stubLabel={selected.kind === "sim" ? "Sim" : "Pitch"}
      >
        <span className="text-[17px] leading-[1.2] font-extrabold text-ink">{selected.name}</span>
        <span className="line-clamp-4 text-[13px] leading-normal text-ink-2">{selected.summary}</span>
        <span className="text-[13px] text-muted">
          {selected.sim
            ? `${selected.passLabel.charAt(0).toUpperCase()}${selected.passLabel.slice(1)}`
            : `Pass at ${selected.pitch?.passingGrade} of 5`}
        </span>
      </FlightStrip>
      <dl className="flex flex-col">
        {definitions.map((row) => (
          <div className="flex justify-between gap-4 border-t border-divider py-2.5 text-sm" key={row.term}>
            <dt className="text-muted">{row.term}</dt>
            <dd className="text-right font-semibold text-ink">{row.value}</dd>
          </div>
        ))}
        {selected.sim ? (
          <div className="flex justify-between gap-4 border-t border-divider py-2.5 text-sm">
            <dt className="text-muted">Practice rounds</dt>
            <dd className="text-right font-semibold text-ink">{rounds(selected.sim.practiceRoundsBeforeSubmit)}</dd>
          </div>
        ) : null}
      </dl>
    </>
  ) : null;

  const itemActions = selected ? (
    <>
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
        <LinkButton
          onClick={() => {
            setDuplicateOf(selected);
            setWizardOpen(true);
          }}
        >
          Duplicate
        </LinkButton>
        {selected.sim ? <LinkButton onClick={() => setAssigning(selected)}>Assign to SEs</LinkButton> : null}
      </div>
      <div className="flex flex-wrap gap-x-3.5 gap-y-2">
        {selected.pitch ? (
          selected.pitch.active ? (
            <LinkButton onClick={() => void setPitchActive(selected, false)} tone="danger">
              Take out of queues
            </LinkButton>
          ) : (
            <LinkButton onClick={() => void setPitchActive(selected, true)}>Make it live</LinkButton>
          )
        ) : (
          <LinkButton onClick={() => void deleteSim(selected)} tone="danger">
            Delete
          </LinkButton>
        )}
      </div>
    </>
  ) : null;

  const aiNote = aiUsage ? (
    <>
      Practice runs on {PROVIDER_LABEL[aiUsage.provider] ?? aiUsage.provider} {aiUsage.model}.{" "}
      {aiUsage.requests30d.toLocaleString("en-US")} requests in the last 30 days. Provider and keys live in{" "}
      <Link className="link" href="/admin/settings/ai">
        Settings
      </Link>
      .
    </>
  ) : (
    <>
      Simulations use the AI provider set in{" "}
      <Link className="link" href="/admin/settings/ai">
        Settings
      </Link>
      . Pitch scenarios are recorded by the SE and graded by their manager.
    </>
  );

  return (
    <div className="grid items-start gap-9 px-[var(--page-pad-x)] pt-[var(--page-pad-y)] pb-10 max-sm:px-4 min-[1100px]:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex min-w-0 flex-col gap-[18px]">
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex min-w-0 flex-col gap-3">
            <p className="label-caps label-caps--blue">Content</p>
            <h1 className="page-title text-ink max-sm:text-[32px] min-[700px]:whitespace-nowrap">
              Practice library. <span className="page-title__accent">What SEs rehearse.</span>
            </h1>
            <p className="max-w-[640px] text-base leading-normal text-ink-2">
              Simulations and pitch scenarios. Managers assign them from Coaching; plans pull them in as steps.
            </p>
          </div>
          <button className="btn-primary whitespace-nowrap" onClick={openNew} type="button">
            New practice
          </button>
        </header>

        <FilterBar
          show={
            <div aria-label="Show" className="flex flex-wrap gap-1.5" role="group">
              <Chip active={filters.show === "all"} count={counts.all} onClick={() => setFilters((f) => ({ ...f, show: "all" }))}>
                All
              </Chip>
              <Chip active={filters.show === "live"} count={counts.live} onClick={() => setFilters((f) => ({ ...f, show: "live" }))}>
                Live
              </Chip>
              <Chip active={filters.show === "draft"} count={counts.draft} onClick={() => setFilters((f) => ({ ...f, show: "draft" }))}>
                Drafts
              </Chip>
            </div>
          }
        >
          <PillSelect
            label="Type"
            onChange={(value) => setFilters((f) => ({ ...f, type: (value || "all") as PracticeFilters["type"] }))}
            options={[
              { value: "sim", label: "Simulation" },
              { value: "pitch", label: "Pitch" },
            ]}
            value={filters.type === "all" ? "" : filters.type}
          />
          <PillSelect
            label="Vertical"
            onChange={(value) => setFilters((f) => ({ ...f, vertical: value }))}
            options={verticalOptions.map((value) => ({ value, label: value }))}
            value={filters.vertical}
          />
          <PillSelect
            label="Competency"
            onChange={(value) => setFilters((f) => ({ ...f, competency: value }))}
            options={competencyOptions.map((value) => ({ value, label: value }))}
            value={filters.competency}
          />
        </FilterBar>

        <div className="flex items-center justify-between gap-4">
          <p className="text-[15px] font-bold text-ink" aria-live="polite">
            {loading ? "Loading…" : `${visible.length} item${visible.length === 1 ? "" : "s"}`}
          </p>
          <label className="relative inline-flex">
            <span className="sr-only">Sort</span>
            <select
              className="cursor-pointer appearance-none rounded-[8px] border border-line bg-white py-[7px] pr-9 pl-3.5 text-sm text-ink"
              onChange={(event) => setSort(event.target.value as PracticeSort)}
              value={sort}
            >
              <option value="used">Sort: Most used</option>
              <option value="name">Sort: Name</option>
              <option value="edited">Sort: Recently edited</option>
            </select>
            <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2 text-ink" />
          </label>
        </div>

        {loading ? (
          <LoadingState label="Loading the practice library…" />
        ) : (
          <TableCard minWidth={680}>
            <caption className="sr-only">Practice items. Open a row to edit it.</caption>
            <thead>
              <tr>
                <th className={thCls} scope="col">
                  Name
                </th>
                <th className={cn(thCls, "w-[120px]")} scope="col">
                  Type
                </th>
                <th className={cn(thCls, "w-[110px]")} scope="col">
                  Used in
                </th>
                <th className={cn(thCls, "w-[96px] text-right")} scope="col">
                  Runs, 30d
                </th>
                <th className={cn(thCls, "w-[110px] text-right")} scope="col">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState>
                      {items.length === 0 ? "Nothing here yet. Start with New practice." : "Nothing matches these filters."}
                    </EmptyState>
                  </td>
                </tr>
              ) : (
                paged.rows.map((item, index) => {
                  const isSelected = selected?.key === item.key;
                  return (
                    <tr
                      className={cn("cursor-pointer", isSelected ? rowHighlight.selected : "hover:bg-bg")}
                      key={item.key}
                      onClick={() => openItem(item)}
                    >
                      <td className={cn(tdCls, "py-3.5", index === 0 && "border-t-0")}>
                        <button
                          aria-label={`Open ${item.name}`}
                          className="group flex w-full min-w-0 items-center gap-2 text-left"
                          onClick={(event) => {
                            event.stopPropagation();
                            openItem(item);
                          }}
                          onFocus={() => setSelectedKey(item.key)}
                          type="button"
                        >
                          <TwoLineCell
                            subline={item.subline}
                            title={
                              <span className="decoration-blue decoration-2 underline-offset-4 group-hover:text-blue group-hover:underline">
                                {item.name}
                              </span>
                            }
                            warning={item.warning}
                          />
                          {fresh.has(item.key) ? (
                            <Tag className="shrink-0" tone="warning">
                              New
                            </Tag>
                          ) : null}
                        </button>
                      </td>
                      <td className={cn(tdCls, "text-sm text-ink-2", index === 0 && "border-t-0")}>{item.typeLabel}</td>
                      <td className={cn(tdCls, "text-sm text-ink-2", index === 0 && "border-t-0")}>{item.usedIn}</td>
                      <td className={cn(tdCls, "num text-right text-sm text-ink-2", index === 0 && "border-t-0")}>{item.runs30d}</td>
                      <td className={cn(tdCls, "text-right", index === 0 && "border-t-0")}>
                        {item.status === "live" ? (
                          <StatusPill tone="success">Live</StatusPill>
                        ) : (
                          <StatusPill tone="warning">Draft</StatusPill>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </TableCard>
        )}
        {!loading ? (
          <DataTablePagination onPageChange={setPage} page={paged.page} pageCount={paged.pageCount} />
        ) : null}
      </div>

      <aside aria-label="Selected practice" className="flex min-w-0 flex-col gap-[22px] pt-1.5">
        <p className="label-caps">As the SE sees it</p>
        {selected ? (
          <>
            {seView}
            <button className="btn-secondary self-start" onClick={() => setEditing(selected)} type="button">
              Edit
            </button>
            {itemActions}
            {selected.pitch ? (
              <p className="text-[13px] leading-normal text-muted">
                Live pitch scenarios rotate into every SE&apos;s pitch queue, four at a time.
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted">{loading ? "Loading…" : "Select an item to see it as the SE will."}</p>
        )}
        <Note title="A note on AI">{aiNote}</Note>
      </aside>

      <PracticeWizard
        competencies={competencies}
        duplicateOf={duplicateOf}
        library={items}
        onClose={() => setWizardOpen(false)}
        onNext={onWizardNext}
        onPublish={(item) => void onPublished(item)}
        open={wizardOpen}
      />
      <PracticeAssignDialog item={assigning} onClose={() => setAssigning(null)} people={people} />
      <SimTemplateEditor
        onClose={() => setEditing(null)}
        side={
          <>
            {seView}
            {itemActions}
          </>
        }
        onSaved={() => {
          setEditing(null);
          void load();
        }}
        row={editing?.sim ?? null}
      />
      <PitchScenarioEditor
        onClose={() => setEditing(null)}
        side={
          <>
            {seView}
            {itemActions}
          </>
        }
        onSaved={() => {
          setEditing(null);
          void load();
        }}
        row={editing?.pitch ?? null}
      />
    </div>
  );
}
