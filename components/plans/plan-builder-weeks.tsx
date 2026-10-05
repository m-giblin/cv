"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type ReactNode } from "react";
import type { LibraryItem, LibraryKind } from "@/components/plans/plan-builder-data";
import { TextInput } from "@/components/admin/admin-ui";
import {
  PLAN_WEEKS,
  WEEKLY_HOURS_TARGET,
  builderTypeShort,
  freeRowFor,
  layoutGrid,
  outlineGroups,
  pad2,
  type BuilderStep,
} from "@/lib/admin/plan-builder";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<LibraryKind, string> = { sim: "SIM", challenge: "CHALLENGE", module: "MODULE" };
const FILTERS: { id: "all" | LibraryKind; label: string }[] = [
  { id: "all", label: "All" },
  { id: "sim", label: "Sims" },
  { id: "challenge", label: "Challenges" },
  { id: "module", label: "Modules" },
];
const WEEK_COLUMNS = { gridTemplateColumns: `repeat(${PLAN_WEEKS}, minmax(0, 1fr))` };

type Drag = { kind: "library"; item: LibraryItem } | { kind: "step"; key: string; span: number };

/** 13b: content library on the left, segment bands + 13-week grid + hours row on the right. */
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
  header: ReactNode;
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

  return (
    <div className="grid min-h-[640px] grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside
        aria-label="Content library"
        className="flex flex-col gap-2.5 border-b border-line bg-white px-3.5 py-5 lg:border-r lg:border-b-0"
      >
        <h2 className="text-lg font-extrabold text-ink">Content library</h2>
        <TextInput
          aria-label="Search content library"
          className="py-2 text-sm"
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search ${library.length} items`}
          type="search"
          value={query}
        />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Content type">
          {FILTERS.map((option) => (
            <button
              aria-pressed={filter === option.id}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold",
                filter === option.id ? "bg-ink text-white" : "border-[1.5px] border-line-strong text-ink hover:bg-blue-soft",
              )}
              key={option.id}
              onClick={() => setFilter(option.id)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
        <ul className="mt-1 flex max-h-[520px] flex-col gap-1.5 overflow-y-auto pr-1">
          {visibleLibrary.length === 0 ? (
            <li className="py-4 text-sm text-muted">No content matches.</li>
          ) : (
            visibleLibrary.map((item) => {
              const dragging = drag?.kind === "library" && drag.item.key === item.key;
              return (
                <li key={item.key}>
                  <button
                    aria-label={`Add ${item.title} to week ${pad2(Math.min(PLAN_WEEKS, lastWeek + 1 || 1))}`}
                    className={cn(
                      "flex w-full cursor-grab flex-col gap-0.5 rounded-[10px] bg-white px-2.5 py-[9px] text-left active:cursor-grabbing",
                      dragging ? "border-[1.5px] border-ink shadow-[var(--shadow-press)]" : "border border-line hover:border-blue",
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
                    <span className="font-mono text-xs text-muted uppercase">
                      {KIND_LABEL[item.kind]}
                      {item.minutes !== null ? ` · ${item.minutes}M` : ""}
                      {dragging ? " · DRAGGING" : ""}
                    </span>
                    <span className="text-sm font-semibold text-ink">{item.title}</span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
        <Link className="link mt-1 text-sm" href="/admin/content">
          + Create new content
        </Link>
      </aside>

      <div className="flex min-w-0 flex-col">
        {header}
        <div className="flex flex-col gap-2 px-7 pb-6">
          <div className="overflow-x-auto">
            <div className="flex min-w-[720px] flex-col gap-2">
              <div className="grid gap-2 font-mono text-xs" style={WEEK_COLUMNS}>
                {groups.map((group) => (
                  <span
                    className="truncate rounded-[8px] bg-blue px-2.5 py-1.5 text-white uppercase"
                    key={group.segmentIndex}
                    style={{ gridColumn: `${group.startWeek} / ${group.endWeek + 1}` }}
                  >
                    {group.name} ◆
                  </span>
                ))}
              </div>
              <div aria-hidden className="grid gap-1 text-center font-mono text-xs text-muted" style={WEEK_COLUMNS}>
                {Array.from({ length: PLAN_WEEKS }, (_, i) => (
                  <span key={i}>W{pad2(i + 1)}</span>
                ))}
              </div>
              <div
                aria-label="Plan weeks"
                className="relative grid gap-1 py-1"
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDrop(null);
                }}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                ref={gridRef}
                role="list"
                style={{ ...WEEK_COLUMNS, gridAutoRows: "62px" }}
              >
                {Array.from({ length: PLAN_WEEKS }, (_, i) => (
                  <span
                    aria-hidden
                    className="pointer-events-none -mr-[3px] border-r border-line"
                    key={`col-${i}`}
                    style={{ gridColumn: i + 1, gridRow: `1 / ${gridRows + 1}` }}
                  />
                ))}
                {blocks.map((block) => {
                  const selected = block.step.key === selectedKey;
                  const gate = block.step.isSegmentGate;
                  return (
                    <button
                      aria-label={`${block.step.title || "Untitled step"}, due week ${block.endWeek}. Open in outline.`}
                      className={cn(
                        "relative flex min-w-0 flex-col gap-0.5 overflow-hidden rounded-[10px] p-2 text-left",
                        gate
                          ? "bg-blue text-white"
                          : selected
                            ? "border-[1.5px] border-blue bg-blue-soft"
                            : "border border-line bg-white hover:border-blue",
                        drag?.kind === "step" && drag.key === block.step.key && "opacity-40",
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
                      type="button"
                    >
                      <span
                        className={cn(
                          "font-mono text-xs uppercase",
                          gate ? "text-signal" : selected ? "text-blue" : "text-muted",
                        )}
                      >
                        {gate ? "GATE" : builderTypeShort(block.step.stepType)}
                      </span>
                      <span className={cn("truncate text-[13px]", selected ? "font-bold" : "font-semibold")}>
                        {block.step.title || "Untitled step"}
                      </span>
                    </button>
                  );
                })}
                {drop ? (
                  <span
                    className="pointer-events-none flex items-center justify-center rounded-[10px] border-2 border-dashed border-signal bg-signal-soft p-2 text-center text-[13px] font-bold text-ink"
                    style={{ gridColumn: `${drop.week} / ${drop.week + drop.span}`, gridRow: drop.row + 1 }}
                  >
                    Drop here · W{pad2(drop.week)}
                    {drop.span > 1 ? `–${pad2(drop.week + drop.span - 1)}` : ""}
                  </span>
                ) : null}
              </div>
              <div className="mt-1 grid gap-1 text-center font-mono text-xs text-ink-2" style={WEEK_COLUMNS}>
                {minutesPerWeek.map((minutes, i) => {
                  if (minutes === null) {
                    return (
                      <span aria-label={`Week ${i + 1}: no estimate`} className="text-faint" key={i}>
                        —
                      </span>
                    );
                  }
                  const hours = Math.max(1, Math.round(minutes / 60));
                  const over = minutes / 60 > WEEKLY_HOURS_TARGET;
                  return (
                    <span
                      aria-label={`Week ${i + 1}: ${hours} hours${over ? ", over target" : ""}`}
                      className={over ? "font-medium text-warning" : undefined}
                      key={i}
                    >
                      {hours}H{over ? " !" : ""}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
          <p className="mt-1 text-[13px] text-muted">
            The bottom row shows estimated hours per week from linked content. Weeks above {WEEKLY_HOURS_TARGET} hours
            are flagged for a ramping SE. Drag content onto a week to add a step, drag a block to move it, or click any
            block to open it in the step editor.
          </p>
        </div>
      </div>
    </div>
  );
}
