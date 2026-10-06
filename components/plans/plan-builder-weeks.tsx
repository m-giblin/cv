"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type ReactNode } from "react";
import type { LibraryItem, LibraryKind } from "@/components/plans/plan-builder-data";
import { TextInput } from "@/components/admin/admin-ui";
import { Chip } from "@/components/ui/chip";
import {
  PLAN_WEEKS,
  WEEKLY_HOURS_TARGET,
  builderTypeLabel,
  freeRowFor,
  gateNumbers,
  layoutGrid,
  outlineGroups,
  type BuilderStep,
} from "@/lib/admin/plan-builder";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<LibraryKind, string> = { sim: "Simulation", challenge: "Challenge", module: "Module" };
const FILTERS: { id: "all" | LibraryKind; label: string }[] = [
  { id: "all", label: "All" },
  { id: "sim", label: "Sims" },
  { id: "module", label: "Modules" },
  { id: "challenge", label: "Challenges" },
];
const WEEK_COLUMNS = { gridTemplateColumns: `repeat(${PLAN_WEEKS}, minmax(0, 1fr))` };

type Drag = { kind: "library"; item: LibraryItem } | { kind: "step"; key: string; span: number };

/** 13b: content library on the left; segment bands, the 13-week grid and the hours row on the right. */
export function PlanWeeksView({
  header,
  steps,
  library,
  selectedKey,
  minutesPerWeek,
  onOpenStep,
  onAddFromLibrary,
  onMoveStep,
}: {
  /** Optional; the builder renders its header bar above both views. */
  header?: ReactNode;
  steps: BuilderStep[];
  library: LibraryItem[];
  selectedKey: string | null;
  minutesPerWeek: (number | null)[];
  onOpenStep: (key: string) => void;
  onAddFromLibrary: (item: LibraryItem, week: number) => void;
  onMoveStep: (key: string, week: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | LibraryKind>("all");
  const [drag, setDrag] = useState<Drag | null>(null);
  const [drop, setDrop] = useState<{ week: number; row: number; span: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const groups = useMemo(() => outlineGroups(steps).filter((group) => group.segmentIndex !== null), [steps]);
  const { blocks, rows } = useMemo(() => layoutGrid(steps), [steps]);
  const lastWeek = blocks.reduce((max, block) => Math.max(max, block.endWeek), 0);

  const visibleLibrary = library.filter(
    (item) =>
      (filter === "all" || item.kind === filter) &&
      (!query.trim() || item.title.toLowerCase().includes(query.trim().toLowerCase())),
  );

  function weekFromPointer(clientX: number): number {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 1;
    return Math.min(PLAN_WEEKS, Math.max(1, Math.floor(((clientX - rect.left) / rect.width) * PLAN_WEEKS) + 1));
  }

  function handleDragOver(event: React.DragEvent) {
    if (!drag) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = drag.kind === "library" ? "copy" : "move";
    const span = drag.kind === "step" ? drag.span : 1;
    const start = Math.min(weekFromPointer(event.clientX), PLAN_WEEKS - span + 1);
    const end = start + span - 1;
    const others = drag.kind === "step" ? blocks.filter((block) => block.step.key !== drag.key) : blocks;
    const row = freeRowFor(others, start, end);
    if (!drop || drop.week !== start || drop.row !== row || drop.span !== span) setDrop({ week: start, row, span });
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    if (drag && drop) {
      const dueWeek = drop.week + drop.span - 1;
      if (drag.kind === "library") onAddFromLibrary(drag.item, dueWeek);
      else onMoveStep(drag.key, dueWeek);
    }
    setDrag(null);
    setDrop(null);
  }

  const gridRows = Math.max(rows, drop ? drop.row + 1 : 0) + 1;

  const gates = gateNumbers(steps);
  const overWeeks = minutesPerWeek
    .map((minutes, i) => ({ week: i + 1, over: minutes !== null && minutes / 60 > WEEKLY_HOURS_TARGET }))
    .filter((entry) => entry.over)
    .map((entry) => entry.week);
  const gateLegend = steps
    .filter((step) => step.isSegmentGate)
    .map((step) => `${gates.get(step.key)} ${step.title || "untitled"}`)
    .join(", ");

  return (
    <div className="grid flex-1 grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside
        aria-label="Content library"
        className="flex flex-col gap-2.5 border-b border-line bg-white px-4 py-[18px] lg:border-r lg:border-b-0"
      >
        <h2 className="text-base font-extrabold text-ink">Content library</h2>
        <TextInput
          aria-label="Search the content library"
          className="rounded-full py-2 text-sm"
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search ${library.length} items`}
          type="search"
          value={query}
        />
        <div aria-label="Content type" className="flex flex-wrap gap-1.5" role="group">
          {FILTERS.map((option) => (
            <Chip active={filter === option.id} key={option.id} onClick={() => setFilter(option.id)}>
              {option.label}
            </Chip>
          ))}
        </div>
        <ul className="mt-1 flex max-h-[560px] flex-col gap-2 overflow-y-auto p-1">
          {visibleLibrary.length === 0 ? (
            <li className="py-4 text-sm text-muted">No content matches.</li>
          ) : (
            visibleLibrary.map((item) => {
              const dragging = drag?.kind === "library" && drag.item.key === item.key;
              return (
                <li key={item.key}>
                  <button
                    aria-label={`Add ${item.title} to week ${Math.min(PLAN_WEEKS, lastWeek + 1 || 1)}`}
                    className={cn(
                      "flex w-full cursor-grab flex-col gap-0.5 rounded-[10px] border bg-white px-3 py-2.5 text-left transition-transform active:cursor-grabbing",
                      dragging ? "rotate-[-1.5deg] border-ink shadow-[var(--shadow-drag)]" : "border-line hover:border-blue",
                    )}
                    draggable
                    onClick={() => onAddFromLibrary(item, Math.min(PLAN_WEEKS, lastWeek + 1 || 1))}
                    onDragEnd={() => {
                      setDrag(null);
                      setDrop(null);
                    }}
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "copy";
                      event.dataTransfer.setData("text/plain", item.key);
                      setDrag({ kind: "library", item });
                    }}
                    type="button"
                  >
                    <span className="text-sm font-bold text-ink">{item.title}</span>
                    <span className="text-xs text-muted">
                      {KIND_LABEL[item.kind]}
                      {item.minutes !== null ? `, ${item.minutes} min` : ""}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
        <Link className="link mt-1 text-sm" href="/admin/content">
          Add content to the library
        </Link>
      </aside>

      <div className="flex min-w-0 flex-col">
        {header}
        <div className="flex flex-col gap-2.5 px-7 py-[22px] max-sm:px-4">
          <div className="overflow-x-auto">
            <div className="flex min-w-[720px] flex-col gap-2.5">
              <div className="grid gap-1.5" style={WEEK_COLUMNS}>
                {groups.map((group) => (
                  <span
                    className="truncate rounded-[8px] bg-blue px-3 py-2 text-[13px] font-bold text-white"
                    key={group.segmentIndex}
                    style={{ gridColumn: `${group.startWeek} / ${group.endWeek + 1}` }}
                  >
                    {group.name}
                  </span>
                ))}
              </div>
              <div aria-hidden className="grid gap-1.5 text-center text-xs font-bold text-muted" style={WEEK_COLUMNS}>
                {Array.from({ length: PLAN_WEEKS }, (_, i) => (
                  <span key={i}>Wk {i + 1}</span>
                ))}
              </div>
              <div
                aria-label="Plan weeks"
                className="relative grid gap-2 py-1.5"
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDrop(null);
                }}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                ref={gridRef}
                role="list"
                style={{ ...WEEK_COLUMNS, gridAutoRows: "minmax(64px, auto)" }}
              >
                {Array.from({ length: PLAN_WEEKS }, (_, i) => (
                  <span
                    aria-hidden
                    className="pointer-events-none -mr-[5px] border-r border-divider"
                    key={`col-${i}`}
                    style={{ gridColumn: i + 1, gridRow: `1 / ${gridRows + 1}` }}
                  />
                ))}
                {blocks.map((block) => {
                  const selected = block.step.key === selectedKey;
                  const gate = block.step.isSegmentGate;
                  const dragging = drag?.kind === "step" && drag.key === block.step.key;
                  const label = gate ? `Gate ${gates.get(block.step.key) ?? ""}`.trim() : block.step.title || "Untitled step";
                  return (
                    <button
                      aria-label={`${gate ? `${label}, ${block.step.title || "untitled"}` : label}, ${builderTypeLabel(block.step.stepType).toLowerCase()}, due week ${block.endWeek}. Open in the outline.`}
                      className={cn(
                        "relative min-w-0 overflow-hidden rounded-[8px] px-2.5 py-2 text-left text-[13px] leading-[1.25] font-bold break-words",
                        gate
                          ? "bg-blue text-white"
                          : selected
                            ? "border-[1.5px] border-blue bg-blue-soft text-blue"
                            : "border border-line bg-white text-ink hover:border-blue",
                        dragging && "rotate-[-1.5deg] shadow-[var(--shadow-drag)]",
                      )}
                      draggable
                      key={block.step.key}
                      onClick={() => onOpenStep(block.step.key)}
                      onDragEnd={() => {
                        setDrag(null);
                        setDrop(null);
                      }}
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", block.step.key);
                        setDrag({ kind: "step", key: block.step.key, span: block.endWeek - block.startWeek + 1 });
                      }}
                      role="listitem"
                      style={{ gridColumn: `${block.startWeek} / ${block.endWeek + 1}`, gridRow: block.row + 1 }}
                      title={block.step.title || undefined}
                      type="button"
                    >
                      {label}
                    </button>
                  );
                })}
                {drop ? (
                  <span
                    className="pointer-events-none flex items-center justify-center rounded-[8px] border-2 border-dashed border-signal bg-signal-soft p-2 text-center text-[13px] font-bold text-warning"
                    style={{ gridColumn: `${drop.week} / ${drop.week + drop.span}`, gridRow: drop.row + 1 }}
                  >
                    Drop here
                  </span>
                ) : null}
              </div>
              <div
                className="num grid gap-1.5 border-t border-line pt-2.5 text-center text-[13px] font-bold"
                style={WEEK_COLUMNS}
              >
                {minutesPerWeek.map((minutes, i) => {
                  if (minutes === null) {
                    return (
                      <span aria-label={`Week ${i + 1}: no estimate`} className="font-medium text-muted" key={i}>
                        None
                      </span>
                    );
                  }
                  const hours = Math.max(1, Math.round(minutes / 60));
                  const over = minutes / 60 > WEEKLY_HOURS_TARGET;
                  return (
                    <span
                      aria-label={`Week ${i + 1}: ${hours} hours${over ? ", over the guideline" : ""}`}
                      className={over ? "text-warning" : "text-ink-2"}
                      key={i}
                    >
                      {hours}h{over ? " !" : ""}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
          <p className="text-[13px] text-muted">
            Hours per week.{" "}
            {overWeeks.length
              ? `Week${overWeeks.length === 1 ? "" : "s"} ${overWeeks.join(", ")} ${overWeeks.length === 1 ? "runs" : "run"} over the ${WEEKLY_HOURS_TARGET}-hour guideline. `
              : `Every week is within the ${WEEKLY_HOURS_TARGET}-hour guideline. `}
            {gateLegend ? `Blue blocks are gates: ${gateLegend}. ` : ""}
            Drag content onto a week to add a step, drag a block to move it, or select one to edit it.
          </p>
        </div>
      </div>
    </div>
  );
}
