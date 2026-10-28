"use client";

import { format } from "date-fns";
import {
  ArrowUpRight,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Flag,
  HeartHandshake,
  ListChecks,
  MessageSquareText,
  MessagesSquare,
  Mic,
  NotebookPen,
  Search,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";
import { DrillEvidence, QuizAnswers } from "@/components/manager/assigned-work-list";
import { Drawer } from "@/components/ui/drawer";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import type { RecordPhase, RecordPreset, ScoreSummary } from "@/lib/record/period";
import {
  KIND_LABEL,
  entryInFilter,
  entryMatches,
  groupByDay,
  type PersonRecord,
  type RecordEntry,
  type RecordFilter,
  type RecordKind,
  type RecordTone,
} from "@/lib/record/record-model";
import { localToday } from "@/lib/utils/date-only";
import { cn } from "@/lib/utils";

const PRESETS: { id: RecordPreset; label: string }[] = [
  { id: "month", label: "This month" },
  { id: "quarter", label: "Quarter" },
  { id: "year", label: "Year" },
  { id: "custom", label: "Custom" },
];

const PHASES: { id: RecordPhase; label: string }[] = [
  { id: "all", label: "All" },
  { id: "onboarding", label: "Onboarding" },
  { id: "ongoing", label: "Ongoing" },
];

const KIND_ICON: Record<RecordKind, LucideIcon> = {
  stage: Flag,
  gate: BadgeCheck,
  work: ClipboardCheck,
  simulation: MessagesSquare,
  pitch: Mic,
  check: ListChecks,
  one_on_one: Users,
  mentor: HeartHandshake,
  coaching: NotebookPen,
};

const TONE_TEXT: Record<RecordTone, string> = { good: "text-success", warn: "text-warning", bad: "text-danger", neutral: "text-muted" };
const TONE_CHIP: Record<RecordTone, string> = {
  good: "bg-success-soft text-success",
  warn: "bg-warning-soft text-warning",
  bad: "bg-danger-soft text-danger",
  neutral: "bg-surface-2 text-ink-2",
};
const TONE_EDGE: Record<RecordTone, string> = { good: "border-l-success", warn: "border-l-warning-dot", bad: "border-l-danger", neutral: "border-l-line-strong" };

/** Wide enough for the list and the detail side by side; narrower screens open the detail as its own workbench. */
function useWide() {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia("(min-width: 1024px)");
      query.addEventListener("change", notify);
      return () => query.removeEventListener("change", notify);
    },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => true,
  );
}

function when(iso: string, pattern = "MMM d, yyyy") {
  return format(new Date(iso), pattern);
}

function trendWord(summary: ScoreSummary) {
  return summary.trend === "up" ? "↑" : summary.trend === "down" ? "↓" : summary.trend === "steady" ? "→" : "";
}

function Chip({ tone, children, className }: { tone: RecordTone; children: ReactNode; className?: string }) {
  return <span className={cn("num inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-bold", TONE_CHIP[tone], className)}>{children}</span>;
}

/** A headline card in the glance row. Clicking it narrows the timeline. */
function Glance({ label, onClick, active, children }: { label: string; onClick?: () => void; active?: boolean; children: ReactNode }) {
  const body = (
    <>
      <span className="label-caps">{label}</span>
      {children}
    </>
  );
  const cls = cn(
    "flex min-w-0 flex-col gap-1.5 rounded-[14px] border bg-white px-4 py-3 text-left shadow-[var(--shadow-card)]",
    active ? "border-ink" : "border-line",
  );
  return onClick ? (
    <button aria-pressed={active} className={cn(cls, "hover:border-line-strong")} onClick={onClick} type="button">
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function ScoreLine({ label, score, pass }: { label: string; score: number | null; pass: number | null }) {
  const tone: RecordTone = score === null ? "neutral" : pass === null ? (score < 60 ? "bad" : score < 70 ? "warn" : "good") : score >= pass ? (score - pass <= 5 ? "warn" : "good") : "bad";
  const bar = { good: "bg-success", warn: "bg-warning-dot", bad: "bg-danger", neutral: "bg-faint" }[tone];
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
      <span className="truncate text-[13px] text-ink-2">{label}</span>
      <span className={cn("num text-sm font-bold", TONE_TEXT[tone])}>
        {score ?? "–"}
        {pass !== null ? <span className="font-normal text-muted"> / pass {pass}</span> : null}
      </span>
      <span className="relative col-span-2 h-1.5 rounded-full bg-track">
        <span className={cn("absolute inset-y-0 left-0 rounded-full", bar)} style={{ width: `${Math.max(0, Math.min(100, score ?? 0))}%` }} />
        {pass !== null ? <span aria-hidden className="absolute -top-0.5 h-2.5 w-0.5 bg-ink" style={{ left: `${pass}%` }} /> : null}
      </span>
    </div>
  );
}

function DetailBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h4 className="label-caps">{title}</h4>
      {children}
    </section>
  );
}

/** Everything about one item: what people said first, then the numbers and the facts. */
function EntryDetail({
  entry,
  position,
  onStep,
  onOpen,
}: {
  entry: RecordEntry;
  position?: { index: number; total: number };
  onStep?: (delta: number) => void;
  /** Opens the assignment's evidence in a workbench over the Record. */
  onOpen: (entry: RecordEntry) => void;
}) {
  const Icon = KIND_ICON[entry.kind];
  const open = entry.open;
  return (
    <article className="flex flex-col gap-5" aria-label={entry.title}>
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-[13px] text-muted">
            <Icon aria-hidden className="h-4 w-4" />
            {KIND_LABEL[entry.kind]} · {when(entry.at, "EEE, MMM d, yyyy, h:mm a")}
            {entry.phase === "onboarding" ? " · onboarding" : ""}
          </span>
          {position && onStep ? (
            <span className="flex items-center gap-1">
              <span className="num mr-1 text-[12px] text-muted">
                {position.index + 1} of {position.total}
              </span>
              <button aria-label="Previous item" className="rounded-md p-1 text-ink-2 hover:bg-surface-2 disabled:opacity-30" disabled={position.index === 0} onClick={() => onStep(-1)} type="button">
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                aria-label="Next item"
                className="rounded-md p-1 text-ink-2 hover:bg-surface-2 disabled:opacity-30"
                disabled={position.index >= position.total - 1}
                onClick={() => onStep(1)}
                type="button"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </span>
          ) : null}
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-[22px] leading-tight font-extrabold tracking-[-0.01em] text-ink">{entry.title}</h3>
            {entry.subtitle ? <p className="mt-1 text-sm text-ink-2">{entry.subtitle}</p> : null}
          </div>
          {entry.headline ? <Chip className="shrink-0 px-3 py-1 text-[15px]" tone={entry.headline.tone}>{entry.headline.value}</Chip> : null}
        </div>
        {open ? (
          <button aria-haspopup="dialog" className="btn-secondary inline-flex items-center gap-1.5 self-start" onClick={() => onOpen(entry)} type="button">
            {open.label} <ArrowUpRight aria-hidden className="h-4 w-4" />
          </button>
        ) : null}
      </header>

      {entry.notes.length ? (
        <DetailBlock title={`Notes (${entry.notes.length})`}>
          <ul className="flex flex-col gap-2">
            {entry.notes.map((note, index) => (
              <li className={cn("rounded-[10px] border border-line border-l-4 bg-white px-3.5 py-2.5", TONE_EDGE[note.tone ?? "neutral"])} key={`${note.label}-${index}`}>
                <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-[12px]">
                  <span className={cn("font-bold tracking-wide uppercase", TONE_TEXT[note.tone ?? "neutral"] === "text-muted" ? "text-ink-2" : TONE_TEXT[note.tone ?? "neutral"])}>{note.label}</span>
                  {note.author || note.at ? (
                    <span className="text-muted">
                      {note.author}
                      {note.author && note.at ? " · " : ""}
                      {note.at ? when(note.at, "MMM d") : ""}
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-ink">{note.body}</p>
              </li>
            ))}
          </ul>
        </DetailBlock>
      ) : null}

      {entry.scores.some((score) => score.score !== null) ? (
        <DetailBlock title="Scores">
          <div className="grid gap-3 sm:grid-cols-2">
            {entry.scores.map((score) => (
              <ScoreLine key={score.label} label={score.label} pass={score.pass} score={score.score} />
            ))}
          </div>
        </DetailBlock>
      ) : null}

      {entry.facts.length ? (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-[12px] bg-surface-2 px-4 py-3 sm:grid-cols-3">
          {entry.facts.map((fact) => (
            <div className="min-w-0" key={fact.label}>
              <dt className="text-[12px] text-muted">{fact.label}</dt>
              <dd className="truncate text-sm font-semibold text-ink" title={fact.value}>
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {entry.lists.map((list) => (
        <DetailBlock key={list.label} title={list.label}>
          <ul className="flex flex-col gap-1 text-sm text-ink">
            {list.items.map((item, index) => (
              <li key={`${list.label}-${index}`}>{/^[✓–]/.test(item) ? item : `• ${item}`}</li>
            ))}
          </ul>
        </DetailBlock>
      ))}

      {entry.texts.map((block) => (
        <DetailBlock key={block.label} title={block.label}>
          <blockquote className="rounded-[10px] bg-surface-2 px-4 py-3 text-sm leading-relaxed whitespace-pre-line text-ink">{block.body}</blockquote>
        </DetailBlock>
      ))}

      {!entry.notes.length && !entry.scores.some((score) => score.score !== null) && !entry.lists.length && !entry.texts.length ? (
        <p className="text-sm text-muted">Nobody left notes on this one.</p>
      ) : null}
    </article>
  );
}

/**
 * A person's Record as a workbench: a scannable timeline of what they accomplished in the period on
 * the left, and the full story of the selected item (every note, score and fact) on the right.
 * Arrow keys or j/k move through the list, / jumps to search. Managers open it from the SE workbench;
 * people open their own.
 */
export function PersonRecordWorkbench({
  userId,
  personName,
  onClose,
}: {
  userId: string;
  personName: string;
  /** Must be stable (useCallback): the drawer re-runs its focus trap when it changes. */
  onClose: () => void;
}) {
  const wide = useWide();
  const [preset, setPreset] = useState<RecordPreset>("month");
  const [phase, setPhase] = useState<RecordPhase>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [record, setRecord] = useState<PersonRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RecordFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Narrow screens: the item opened in its own workbench.
  const [openedId, setOpenedId] = useState<string | null>(null);
  const closeOpened = useCallback(() => setOpenedId(null), []);
  // An assignment's answers and drill transcripts, stacked over the Record so Esc comes back here.
  const [evidence, setEvidence] = useState<RecordEntry | null>(null);
  const closeEvidence = useCallback(() => setEvidence(null), []);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const waitingForRange = preset === "custom" && !range;
  useEffect(() => {
    if (waitingForRange) return;
    let cancelled = false;
    const params = new URLSearchParams({
      userId,
      preset,
      phase,
      today: localToday(),
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    });
    if (preset === "custom" && range) {
      params.set("from", range.from);
      params.set("to", range.to);
    }
    setLoading(true);
    void fetch(`/api/record?${params.toString()}`)
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as { record?: PersonRecord; error?: string };
        if (cancelled) return;
        if (!response.ok || !body.record) {
          setError(body.error ?? "Couldn't load the record.");
          return;
        }
        setError(null);
        setRecord(body.record);
      })
      .catch(() => !cancelled && setError("Couldn't load the record."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [userId, preset, phase, range, waitingForRange]);

  const visible = useMemo(
    () => (record?.entries ?? []).filter((entry) => entryInFilter(entry, filter) && entryMatches(entry, query)),
    [record, filter, query],
  );
  const groups = useMemo(() => groupByDay(visible, (iso) => format(new Date(iso), "yyyy-MM-dd")), [visible]);
  const ordered = useMemo(() => groups.flatMap((group) => group.entries), [groups]);
  // The selection follows the list: keep it while it's visible, otherwise the newest item.
  const selected = ordered.find((entry) => entry.id === selectedId) ?? (wide ? ordered[0] : undefined);
  const selectedIndex = selected ? ordered.indexOf(selected) : -1;
  const opened = openedId ? record?.entries.find((entry) => entry.id === openedId) : undefined;

  const select = useCallback(
    (id: string) => {
      setSelectedId(id);
      if (!wide) setOpenedId(id);
      listRef.current?.querySelector<HTMLElement>(`[data-entry="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "nearest" });
    },
    [wide],
  );
  const step = useCallback(
    (delta: number) => {
      if (!ordered.length) return;
      const next = ordered[Math.max(0, Math.min(ordered.length - 1, (selectedIndex < 0 ? -1 : selectedIndex) + delta))];
      if (!next) return;
      setSelectedId(next.id);
      const row = listRef.current?.querySelector<HTMLElement>(`[data-entry="${CSS.escape(next.id)}"]`);
      row?.scrollIntoView({ block: "nearest" });
      row?.focus();
    },
    [ordered, selectedIndex],
  );

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
    if (event.key === "/" && !typing) {
      event.preventDefault();
      searchRef.current?.focus();
      return;
    }
    if (typing || !wide || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === "ArrowDown" || event.key === "j") {
      event.preventDefault();
      step(1);
    } else if (event.key === "ArrowUp" || event.key === "k") {
      event.preventDefault();
      step(-1);
    }
  }

  const summary = record?.summary;
  const counts = summary?.counts;
  const filters: { id: RecordFilter; label: string; count: number }[] = counts
    ? [
        { id: "all", label: "All", count: record!.entries.length },
        { id: "stage", label: "Stages", count: counts.stage },
        { id: "gate", label: "Sign-offs", count: counts.gate },
        { id: "work", label: "Assigned work", count: counts.work },
        { id: "practice", label: "Practice", count: counts.simulation + counts.pitch + counts.check },
        { id: "meetings", label: "1:1s and notes", count: counts.one_on_one + counts.mentor + counts.coaching },
        { id: "notes", label: "Has notes", count: record!.entries.filter((entry) => entry.notes.length).length },
      ]
    : [];
  const practiceCount = counts ? counts.simulation + counts.pitch + counts.check : 0;
  const practiceScores = summary ? [summary.practice.simulations, summary.practice.pitches, summary.practice.checks].flatMap((group) => group.points) : [];
  const practiceAverage = practiceScores.length ? Math.round(practiceScores.reduce((sum, value) => sum + value, 0) / practiceScores.length) : null;
  const closest = summary?.closestCall;
  const toggleFilter = (id: RecordFilter) => setFilter((current) => (current === id ? "all" : id));

  const headline = record
    ? [
        counts!.stage ? `${counts!.stage} stage${counts!.stage === 1 ? "" : "s"} finished` : null,
        summary!.gates.approved ? `${summary!.gates.approved} sign-off${summary!.gates.approved === 1 ? "" : "s"}` : null,
        counts!.work ? `${counts!.work} assignment${counts!.work === 1 ? "" : "s"} done` : null,
        practiceCount ? `${practiceCount} practice session${practiceCount === 1 ? "" : "s"}` : null,
      ]
        .filter(Boolean)
        .join(" · ") || "Nothing recorded in this period"
    : undefined;

  return (
    <Drawer
      bodyWidth="full"
      eyebrow={`Record · ${record?.period.label ?? "Loading"}`}
      onClose={onClose}
      open
      subtitle={headline}
      title={personName}
    >
      <div className="flex flex-col gap-4" onKeyDown={onKeyDown}>
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedToggle
            label="Period"
            onChange={(id) => {
              setPreset(id as RecordPreset);
              if (id !== "custom") setRange(null);
            }}
            options={PRESETS}
            value={preset}
          />
          <SegmentedToggle label="Phase" onChange={(id) => setPhase(id as RecordPhase)} options={PHASES} value={phase} />
          <label className="relative ml-auto flex min-w-[220px] flex-1 items-center sm:max-w-[340px]">
            <Search aria-hidden className="pointer-events-none absolute left-3 h-4 w-4 text-muted" />
            <input
              aria-label="Search titles and notes"
              className="w-full rounded-full border border-line bg-white py-2 pr-9 pl-9 text-sm text-ink placeholder:text-muted"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape" && query) {
                  event.stopPropagation();
                  setQuery("");
                } else if (event.key === "Enter" || event.key === "ArrowDown") {
                  event.preventDefault();
                  const first = ordered[0];
                  if (first) {
                    select(first.id);
                    listRef.current?.querySelector<HTMLElement>(`[data-entry="${CSS.escape(first.id)}"]`)?.focus();
                  }
                }
              }}
              placeholder="Search titles and notes"
              ref={searchRef}
              type="search"
              value={query}
            />
            <kbd className="pointer-events-none absolute right-3 rounded border border-line px-1.5 text-[11px] text-muted">/</kbd>
          </label>
        </div>

        {preset === "custom" ? (
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (from && to) setRange({ from, to });
            }}
          >
            <label className="flex flex-col gap-1 text-[13px] text-muted">
              From
              <input className="rounded-[10px] border border-line bg-white px-3 py-2 text-sm text-ink" onChange={(event) => setFrom(event.target.value)} type="date" value={from} />
            </label>
            <label className="flex flex-col gap-1 text-[13px] text-muted">
              To
              <input className="rounded-[10px] border border-line bg-white px-3 py-2 text-sm text-ink" onChange={(event) => setTo(event.target.value)} type="date" value={to} />
            </label>
            <button className="btn-primary" disabled={!from || !to} type="submit">
              Show range
            </button>
          </form>
        ) : null}

        {waitingForRange ? (
          <p className="text-sm text-muted">Pick a start and end date.</p>
        ) : error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : !record || !summary || !counts ? (
          <p className="text-sm text-muted">Loading the record</p>
        ) : (
          <div aria-busy={loading} className={cn("flex flex-col gap-4 transition-opacity", loading && "opacity-60")}>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Glance active={filter === "stage"} label="Progress" onClick={() => toggleFilter("stage")}>
                <span className="text-sm text-ink">
                  <span className="num text-[22px] font-extrabold text-ink">{counts.stage}</span> stage{counts.stage === 1 ? "" : "s"} finished
                </span>
                <span className="text-[13px] text-muted">
                  {record.onboarding
                    ? record.onboarding.end
                      ? `Onboarding finished ${when(record.onboarding.end)}`
                      : `Onboarding under way since ${when(`${record.onboarding.start}T12:00:00`)}`
                    : "No onboarding plan"}
                </span>
              </Glance>
              <Glance active={filter === "gate"} label="Sign-offs" onClick={() => toggleFilter("gate")}>
                <span className="text-sm text-ink">
                  <span className="num text-[22px] font-extrabold text-ink">{summary.gates.approved}</span> signed
                  {summary.gates.averageConfidence !== null ? (
                    <>
                      , confidence <span className="num font-bold">{summary.gates.averageConfidence}</span>/5
                    </>
                  ) : null}
                </span>
                <span className={cn("text-[13px]", summary.gates.sentBack ? "font-semibold text-danger" : "text-muted")}>
                  {summary.gates.sentBack ? `${summary.gates.sentBack} sent back` : "None sent back"}
                </span>
              </Glance>
              <Glance active={filter === "practice"} label="Practice" onClick={() => toggleFilter("practice")}>
                <span className="text-sm text-ink">
                  <span className="num text-[22px] font-extrabold text-ink">{practiceCount}</span> session{practiceCount === 1 ? "" : "s"}
                  {practiceAverage !== null ? (
                    <>
                      , average <span className="num font-bold">{practiceAverage}</span>
                    </>
                  ) : null}
                </span>
                <span className="num flex flex-wrap gap-x-3 text-[13px] text-muted">
                  {(
                    [
                      ["Sims", summary.practice.simulations],
                      ["Pitches", summary.practice.pitches],
                      ["Checks", summary.practice.checks],
                    ] as const
                  )
                    .filter(([, group]) => group.count)
                    .map(([label, group]) => (
                      <span key={label}>
                        {label} {group.average ?? "–"}
                        {trendWord(group) ? <span className={group.trend === "down" ? "text-warning" : group.trend === "up" ? "text-success" : ""}> {trendWord(group)}</span> : null}
                      </span>
                    ))}
                </span>
              </Glance>
              <Glance label={summary.followUps.length ? `Follow-ups (${summary.followUps.length})` : "Worth a look"}>
                {summary.followUps.length ? (
                  <button className="link line-clamp-2 text-left text-sm" onClick={() => select(summary.followUps[0]!.entryId)} type="button">
                    {summary.followUps[0]!.body}
                  </button>
                ) : (
                  <span className="text-sm text-muted">No open next actions.</span>
                )}
                {closest ? (
                  <button className="text-left text-[13px] text-muted hover:text-ink" onClick={() => select(closest.entryId)} type="button">
                    Closest call:{" "}
                    <span className={cn("num font-bold", closest.score < closest.pass ? "text-danger" : "text-warning")}>
                      {closest.score} vs {closest.pass}
                    </span>
                    , {closest.label}
                  </button>
                ) : null}
              </Glance>
            </div>

            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Show">
              {filters.map((item) => (
                <button
                  aria-pressed={filter === item.id}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[13px] font-semibold",
                    filter === item.id ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-2 hover:text-ink",
                    !item.count && filter !== item.id && "opacity-50",
                  )}
                  key={item.id}
                  onClick={() => setFilter(item.id)}
                  type="button"
                >
                  {item.label} <span className="num opacity-70">{item.count}</span>
                </button>
              ))}
            </div>

            <div className="grid gap-4 lg:h-[min(68vh,760px)] lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
              <div className="min-h-0 overflow-y-auto rounded-[14px] border border-line bg-white shadow-[var(--shadow-card)]" ref={listRef}>
                {groups.length ? (
                  groups.map((group) => (
                    <div key={group.day}>
                      <p className="label-caps sticky top-0 z-10 border-b border-divider bg-surface-2 px-4 py-1.5">{format(new Date(`${group.day}T12:00:00`), "EEE, MMM d")}</p>
                      <ul>
                        {group.entries.map((entry) => {
                          const Icon = KIND_ICON[entry.kind];
                          const active = wide && selected?.id === entry.id;
                          return (
                            <li key={entry.id}>
                              <button
                                aria-current={active ? "true" : undefined}
                                className={cn(
                                  "flex w-full items-center gap-3 border-b border-l-[3px] border-b-divider px-4 py-2.5 text-left outline-none focus-visible:bg-blue-soft",
                                  active ? "border-l-blue bg-blue-soft" : "border-l-transparent hover:bg-surface-2",
                                )}
                                data-entry={entry.id}
                                onClick={() => select(entry.id)}
                                type="button"
                              >
                                <Icon aria-hidden className={cn("h-4 w-4 shrink-0", active ? "text-blue" : "text-muted")} />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-semibold text-ink">{entry.title}</span>
                                  <span className="block truncate text-[12px] text-muted">
                                    {KIND_LABEL[entry.kind]}
                                    {entry.subtitle ? ` · ${entry.subtitle}` : ""}
                                  </span>
                                </span>
                                {entry.notes.length ? (
                                  <span className="num flex shrink-0 items-center gap-0.5 text-[12px] text-muted" title={`${entry.notes.length} notes`}>
                                    <MessageSquareText aria-hidden className="h-3.5 w-3.5" />
                                    {entry.notes.length}
                                  </span>
                                ) : null}
                                {entry.headline ? <Chip tone={entry.headline.tone}>{entry.headline.value}</Chip> : null}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))
                ) : (
                  <p className="px-4 py-6 text-sm text-muted">{query ? `Nothing matches “${query}”.` : "Nothing here in this period."}</p>
                )}
              </div>

              {wide ? (
                <div className="min-h-0 overflow-y-auto rounded-[14px] border border-line bg-white p-5 shadow-[var(--shadow-card)]">
                  {selected ? (
                    <EntryDetail entry={selected} onOpen={setEvidence} onStep={step} position={{ index: selectedIndex, total: ordered.length }} />
                  ) : (
                    <p className="text-sm text-muted">Pick an item to read its notes.</p>
                  )}
                </div>
              ) : null}
            </div>
            {wide ? <p className="text-[12px] text-muted">↑ ↓ or j k to move through the list · / to search · Esc to close</p> : null}
          </div>
        )}
      </div>

      {!wide && opened ? (
        <Drawer eyebrow={`${personName} · Record`} onClose={closeOpened} open size="form" title={KIND_LABEL[opened.kind]}>
          <EntryDetail entry={opened} onOpen={setEvidence} />
        </Drawer>
      ) : null}

      {evidence?.open ? (
        <Drawer eyebrow={`${personName} · ${KIND_LABEL[evidence.kind]}`} onClose={closeEvidence} open size="form" title={evidence.title}>
          <div className="flex flex-col gap-5">
            <div>
              <p className="label-caps mb-2">{evidence.open.workKind === "playbook" ? "Knowledge check" : "Their answers"}</p>
              <QuizAnswers chapter={evidence.open.workKind === "playbook"} id={evidence.open.workId} />
            </div>
            {evidence.open.workKind === "playbook" ? <DrillEvidence id={evidence.open.workId} /> : null}
          </div>
        </Drawer>
      ) : null}
    </Drawer>
  );
}
