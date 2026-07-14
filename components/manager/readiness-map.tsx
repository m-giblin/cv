"use client";

import { format, getISOWeek, startOfMonth } from "date-fns";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ReadinessDimName,
  ReadinessMapCell,
  ReadinessMapPayload,
  ReadinessMapSeRow,
  ReadinessStatusLevel,
  ReadinessViewMode,
} from "@/lib/manager/readiness-map-data";

const C = {
  navy: "#00143A",
  blue: "#0071CE",
  green: "#0A6E45",
  red: "#B83128",
  amber: "#D4810A",
  border: "#E2DFD9",
  surface: "#F9F8F6",
  text: "#0D0E12",
  gray: "#7A7772",
  muted: "#A09D98",
};

const LEVEL_STYLES: Record<
  ReadinessStatusLevel,
  { bg: string; text: string; border: string; cellBg: string }
> = {
  critical: {
    bg: "rgba(184,49,40,.06)",
    text: "#B83128",
    border: "rgba(184,49,40,.2)",
    cellBg: "rgba(184,49,40,.14)",
  },
  risk: {
    bg: "rgba(212,129,10,.06)",
    text: "#D4810A",
    border: "rgba(212,129,10,.2)",
    cellBg: "rgba(212,129,10,.10)",
  },
  good: {
    bg: "rgba(10,110,69,.06)",
    text: "#0A6E45",
    border: "rgba(10,110,69,.2)",
    cellBg: "rgba(10,110,69,.10)",
  },
};

const DIM_NAMES: ReadinessDimName[] = ["Ramp", "Sims", "Segments", "Certs", "Lab", "Pitch"];

/** SE | 4 core dims | Lab | Pitch (narrow) | Trend (wider) */
const HEATMAP_GRID_COLS =
  "minmax(156px, 172px) repeat(4, minmax(0, 1fr)) minmax(52px, 0.88fr) minmax(42px, 0.62fr) minmax(108px, 128px)";
const ACTION_COLORS = ["#0071CE", "#CC27B0", "#0A6E45"];

const DIM_SUBTITLES: Record<ReadinessDimName, string> = {
  Ramp: "plan %",
  Sims: "avg score /100",
  Segments: "unlocked /4",
  Certs: "approved /8",
  Lab: "hours this week",
  Pitch: "last score /100",
};

const PILLAR_BADGE_STYLES: Record<
  ReadinessStatusLevel,
  { color: string; bg: string; border: string; dot: string }
> = {
  critical: {
    color: "#FF7B72",
    bg: "rgba(184,49,40,.22)",
    border: "rgba(184,49,40,.5)",
    dot: "#B83128",
  },
  risk: {
    color: "#F0B429",
    bg: "rgba(212,129,10,.18)",
    border: "rgba(212,129,10,.45)",
    dot: "#D4810A",
  },
  good: {
    color: "#4ADE80",
    bg: "rgba(10,110,69,.2)",
    border: "rgba(10,110,69,.45)",
    dot: "#0A6E45",
  },
};

function Avatar({
  initial,
  gradient,
  size = 28,
  fontSize = 10,
}: {
  initial: string;
  gradient: string;
  size?: number;
  fontSize?: number;
}) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-mono font-semibold text-white"
      style={{ width: size, height: size, background: gradient, fontSize }}
    >
      {initial}
    </div>
  );
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="relative h-[3px] overflow-hidden bg-[#ECEAE6]">
      <div className="absolute left-0 top-0 h-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function SegBar({ unlocked, total, color }: { unlocked: number; total: number; color: string }) {
  return (
    <div className="flex h-[3px] gap-0.5">
      {Array.from({ length: total }).map((_, index) => (
        <div key={index} className="flex-1" style={{ background: index < unlocked ? color : "#ECEAE6" }} />
      ))}
    </div>
  );
}

function Sparkline({
  row,
  viewMode,
}: {
  row: ReadinessMapSeRow;
  viewMode: ReadinessViewMode;
}) {
  const sp = viewMode === "weekly" ? row.sparklineWeekly : row.sparklineMonthly;
  const color = sp.delta.includes("-") || sp.delta.startsWith("flat") ? C.red : C.green;
  return (
    <div className="flex flex-col items-center gap-[3px]">
      <svg className="max-w-full" height="24" viewBox="0 0 60 24" width="72">
        <polyline
          points={sp.pts}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="60" cy={sp.endY} r="2.5" fill={color} />
      </svg>
      <span className="font-mono text-[8px]" style={{ color }}>
        {sp.delta}
      </span>
    </div>
  );
}

function HeatCell({
  dim,
  data,
  onClick,
  isSelected,
}: {
  dim: ReadinessDimName;
  data: ReadinessMapCell;
  onClick: () => void;
  isSelected: boolean;
}) {
  const style = LEVEL_STYLES[data.level];

  return (
    <button
      className="flex cursor-pointer flex-col justify-center gap-[3px] border-l border-[#E2DFD9] px-2 py-3 text-left transition-[filter] hover:brightness-[.92]"
      onClick={onClick}
      style={{
        background: isSelected ? `${style.cellBg}99` : style.cellBg,
        outline: isSelected ? `2px solid ${C.blue}` : "none",
        outlineOffset: -1,
      }}
      type="button"
    >
      <div className="font-mono text-[13px] font-medium" style={{ color: style.text }}>
        {data.score}
      </div>
      {data.progressPct != null && dim !== "Sims" && dim !== "Lab" ? (
        <ProgressBar pct={data.progressPct} color={style.text} />
      ) : null}
      {data.segmentUnlocked != null && data.segmentTotal != null ? (
        <SegBar unlocked={data.segmentUnlocked} total={data.segmentTotal} color={style.text} />
      ) : null}
      <div className="text-[8.5px]" style={{ color: style.text }}>
        {data.status}
      </div>
    </button>
  );
}

export function ReadinessMap({ onOpenProfile }: { onOpenProfile?: (userId: string) => void }) {
  const [data, setData] = useState<ReadinessMapPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedDim, setSelectedDim] = useState<ReadinessDimName>("Ramp");
  const [viewMode, setViewMode] = useState<ReadinessViewMode>("weekly");

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/manager/readiness-map");
    if (response.ok) {
      const body = (await response.json()) as ReadinessMapPayload;
      setData(body);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedRow = useMemo(
    () => data?.rows.find((row) => row.userId === selectedUserId) ?? null,
    [data, selectedUserId],
  );
  const dimData = selectedRow?.dims[selectedDim] ?? null;
  const levelStyle = dimData ? LEVEL_STYLES[dimData.level] : LEVEL_STYLES.risk;

  const viewLabel =
    viewMode === "weekly"
      ? `W${getISOWeek(new Date())} · ${format(new Date(), "MMM d")}`
      : format(startOfMonth(new Date()), "MMM yyyy");
  const trendLabel = viewMode === "weekly" ? "Trend" : "4-wk Trend";
  const trendSub = viewMode === "weekly" ? "vs last week" : "rolling 4 weeks";
  const teamDelta = viewMode === "weekly" ? data?.teamDeltaWeekly : data?.teamDeltaMonthly;

  const openPanel = (userId: string, dim: ReadinessDimName) => {
    setSelectedUserId(userId);
    setSelectedDim(dim);
    setPanelOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[#A09D98]" />
      </div>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <div className="border border-[#E2DFD9] bg-white p-8 text-center">
        <p className="text-sm font-semibold text-[#0D0E12]">No SEs on your team yet</p>
        <p className="mt-1 text-[12px] text-[#6B6860]">
          Readiness metrics appear once ramp plans and coaching activity exist.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-14rem)] w-full flex-col overflow-hidden rounded-sm border border-[#E2DFD9] bg-white shadow-[0_1px_2px_rgba(0,0,0,.04)]">
      {/* Toolbar */}
      <div className="flex w-full shrink-0 items-center justify-end gap-2 border-b border-[#E2DFD9] bg-white px-5 py-2">
        <div className="flex overflow-hidden border border-[#D4D1CB]">
          {(["weekly", "monthly"] as ReadinessViewMode[]).map((mode, index) => (
            <button
              className={`px-2.5 py-1 font-mono text-[9px] tracking-wide ${
                viewMode === mode ? "bg-[#00143A] text-white" : "bg-white text-[#7A7772]"
              } ${index > 0 ? "border-l border-[#D4D1CB]" : ""}`}
              key={mode}
              onClick={() => setViewMode(mode)}
              type="button"
            >
              {mode.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 border border-[#C5DCF5] bg-[#F0F7FF] px-2.5 py-1">
          <span className="font-mono text-[9px] text-[#0071CE]">{viewLabel}</span>
        </div>
        <Link
          className="inline-flex items-center border border-[#D4D1CB] px-2.5 py-1 text-[10px] font-semibold text-[#3D3C38] hover:border-[#0071CE] hover:text-[#0071CE]"
          href="/manager?section=cadence"
        >
          + New coaching card
        </Link>
      </div>

      {/* Intel strip */}
      <div className="flex w-full shrink-0 items-center bg-[#00143A] px-5 py-2.5">
        <div className="border-r border-white/10 pr-5">
          <p className="mb-0.5 font-mono text-[7.5px] uppercase tracking-[0.13em] text-white">
            Team Readiness
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-[26px] font-extrabold text-white">{data.teamScore}</span>
            <span className="font-mono text-[9px] text-white">/100</span>
            {teamDelta ? (
              <span className="ml-1 flex items-center gap-1 border border-[rgba(255,255,255,.35)] bg-[rgba(255,255,255,.12)] px-1.5 py-0.5 font-mono text-[8.5px] text-white">
                {teamDelta}
              </span>
            ) : null}
          </div>
        </div>

        {data.dimensionPillars.map((pillar, index) => {
          const badgeStyle = PILLAR_BADGE_STYLES[pillar.badgeTone];
          return (
            <div
              className={`flex flex-col gap-0.5 px-4 ${index < data.dimensionPillars.length - 1 ? "border-r border-white/6" : ""}`}
              key={pillar.label}
            >
              <span className="font-mono text-[7.5px] tracking-[0.1em] text-white">{pillar.label}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-white">{pillar.value}</span>
                <span
                  className="inline-flex items-center gap-1 border px-1.5 py-0.5 font-mono text-[7px] font-semibold uppercase tracking-[0.06em]"
                  style={{
                    color: badgeStyle.color,
                    background: badgeStyle.bg,
                    borderColor: badgeStyle.border,
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: badgeStyle.dot }}
                  />
                  {pillar.badge}
                </span>
              </div>
            </div>
          );
        })}

        <div className="ml-auto">
          <Link
            className="inline-flex items-center border border-white/40 px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-white/10"
            href="/manager?section=cadence"
          >
            Open all coaching plans
          </Link>
        </div>
      </div>

      {/* Priority callout — full width, directly under intel strip */}
      {data.priorities.length > 0 ? (
        <div className="flex w-full shrink-0 items-center gap-4 border-b border-[#E2DFD9] bg-white px-5 py-3">
          <div className="w-[3px] shrink-0 self-stretch bg-[#B83128]" />
          <div className="min-w-0 flex-1">
            <p className="text-[11.5px] font-semibold text-[#0D0E12]">
              {data.priorities.length} coaching priorit{data.priorities.length === 1 ? "y" : "ies"} this week
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-4">
              {data.priorities.map((priority, index) => (
                <div className="flex items-center gap-2" key={priority.userId}>
                  {index > 0 ? <div className="hidden h-5 w-px bg-[#E2DFD9] sm:block" /> : null}
                  <Avatar initial={priority.firstName[0] ?? "?"} gradient={priority.avatarGradient} size={20} fontSize={9} />
                  <div className="min-w-0">
                    <span className="text-[11px] font-medium text-[#0D0E12]">{priority.firstName}</span>
                    <span className="text-[11px] text-[#7A7772]"> — {priority.desc}</span>
                  </div>
                  <button
                    className={`inline-flex items-center px-2 py-1 text-[9.5px] font-semibold ${
                      index === 0
                        ? "bg-[#0071CE] text-white"
                        : "border border-[#D4D1CB] bg-white text-[#3D3C38]"
                    }`}
                    onClick={() => openPanel(priority.userId, priority.dim)}
                    type="button"
                  >
                    Coach now →
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Heatmap + coaching panel (panel only beside heatmap, below priorities) */}
      <div className="flex min-h-0 w-full flex-1 overflow-hidden">
        <div
          className={`min-h-0 w-full flex-1 overflow-y-auto transition-[padding] duration-200 ${panelOpen ? "px-5 py-5" : "py-5"}`}
        >
          <div className="w-full overflow-hidden border border-[#E2DFD9] bg-white">
            <div
              className="grid border-b border-[#E2DFD9] bg-[#F9F8F6]"
              style={{ gridTemplateColumns: HEATMAP_GRID_COLS }}
            >
              <div className="flex items-center justify-between px-3.5 py-2.5">
                <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-[#A09D98]">SE</span>
                <span className="font-mono text-[8px] tracking-wide text-[#A09D98]">Composite</span>
              </div>
              {DIM_NAMES.map((dim) => (
                <div className="border-l border-[#E2DFD9] px-2 py-2.5" key={dim}>
                  <div className="font-mono text-[8px] font-medium uppercase tracking-[0.07em] text-[#3D3C38]">
                    {dim}
                  </div>
                  <div className="mt-0.5 text-[9px] text-[#A09D98]">{DIM_SUBTITLES[dim]}</div>
                </div>
              ))}
              <div className="border-l border-[#E2DFD9] px-2 py-2.5">
                <div className="font-mono text-[8px] uppercase tracking-[0.07em] text-[#A09D98]">{trendLabel}</div>
                <div className="mt-0.5 text-[9px] text-[#A09D98]">{trendSub}</div>
              </div>
            </div>

            {data.rows.map((row, rowIndex) => (
              <div
                className={rowIndex < data.rows.length - 1 ? "border-b border-[#E2DFD9]" : ""}
                key={row.userId}
                style={{ display: "grid", gridTemplateColumns: HEATMAP_GRID_COLS }}
              >
                <button
                  className="flex items-center gap-2.5 px-3.5 py-3 text-left hover:bg-[#F9F8F6]"
                  onClick={() => openPanel(row.userId, row.priorityDim)}
                  type="button"
                >
                  <Avatar initial={row.initial} gradient={row.avatarGradient} />
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-[#0D0E12]">{row.firstName}</p>
                    <p className="font-mono text-[8px] text-[#A09D98]">{row.tenure}</p>
                  </div>
                  <span
                    className="ml-auto font-display text-base font-bold"
                    style={{ color: row.compositeColor }}
                  >
                    {row.composite}
                  </span>
                </button>

                {DIM_NAMES.map((dim) => (
                  <HeatCell
                    data={row.dims[dim]}
                    dim={dim}
                    isSelected={panelOpen && selectedUserId === row.userId && selectedDim === dim}
                    key={dim}
                    onClick={() => openPanel(row.userId, dim)}
                  />
                ))}

                <div className="flex min-w-0 items-center justify-center border-l border-[#E2DFD9] px-1.5 py-3">
                  <Sparkline row={row} viewMode={viewMode} />
                </div>
              </div>
            ))}

            <div
              className="grid border-t-2 border-[#E2DFD9] bg-[#F9F8F6]"
              style={{ gridTemplateColumns: HEATMAP_GRID_COLS }}
            >
              <div className="flex items-center px-3.5 py-2">
                <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-[#A09D98]">Team avg</span>
              </div>
              {DIM_NAMES.map((dim, index) => (
                <div className="border-l border-[#E2DFD9] p-2" key={dim}>
                  <span
                    className="font-mono text-[11px] font-medium"
                    style={{ color: index <= 1 ? C.amber : C.red }}
                  >
                    {data.teamAverages[dim]}
                  </span>
                </div>
              ))}
              <div className="border-l border-[#E2DFD9]" />
            </div>
          </div>

          <div className="mt-3 flex w-full flex-wrap items-center gap-4 px-5">
            {[
              { label: "Critical (<40)", bg: "rgba(184,49,40,.18)", border: "rgba(184,49,40,.3)" },
              { label: "At risk (40–69)", bg: "rgba(212,129,10,.12)", border: "rgba(212,129,10,.3)" },
              { label: "On track (70+)", bg: "rgba(10,110,69,.12)", border: "rgba(10,110,69,.25)" },
            ].map((item) => (
              <div className="flex items-center gap-1.5" key={item.label}>
                <div className="h-2.5 w-2.5 border" style={{ background: item.bg, borderColor: item.border }} />
                <span className="text-[10px] text-[#7A7772]">{item.label}</span>
              </div>
            ))}
            <p className="ml-auto text-[10px] text-[#A09D98]">Click any cell to open coaching actions</p>
          </div>
        </div>

        {/* Coaching panel — slides in beside heatmap only, never over priorities */}
        {panelOpen && selectedRow && dimData ? (
          <div className="flex w-[300px] shrink-0 flex-col overflow-y-auto border-l border-[#E2DFD9] bg-white">
              <div className="flex shrink-0 items-center justify-between border-b border-[#E2DFD9] bg-[#F9F8F6] px-4 py-3.5">
                <div>
                  <p className="mb-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-[#A09D98]">
                    Coaching Focus
                  </p>
                  <p className="text-[13px] font-semibold text-[#0D0E12]">
                    {selectedRow.firstName} · {selectedDim}
                  </p>
                </div>
                <button
                  className="flex h-7 w-7 items-center justify-center border border-[#E2DFD9] bg-white text-[#7A7772]"
                  onClick={() => setPanelOpen(false)}
                  type="button"
                >
                  ×
                </button>
              </div>

              <div className="shrink-0 border-b border-[#E2DFD9] px-4 py-3.5">
                <div className="mb-2.5 flex items-center gap-2.5">
                  <Avatar initial={selectedRow.initial} gradient={selectedRow.avatarGradient} size={36} fontSize={13} />
                  <div>
                    <p className="text-[13px] font-semibold text-[#0D0E12]">{selectedRow.fullName}</p>
                    <p className="text-[11px] text-[#7A7772]">
                      {selectedRow.tenure} · composite {selectedRow.composite}
                    </p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="mb-0.5 font-mono text-[9px] text-[#A09D98]">{selectedDim}</p>
                    <p className="font-display text-[22px] font-extrabold" style={{ color: levelStyle.text }}>
                      {dimData.score}
                    </p>
                  </div>
                </div>
                <div className="border px-2.5 py-2" style={{ background: levelStyle.bg, borderColor: levelStyle.border }}>
                  <p className="text-[11px] font-medium" style={{ color: levelStyle.text }}>
                    {dimData.status}
                  </p>
                  <p className="mt-0.5 text-[10.5px] leading-snug text-[#5A5855]">{dimData.insight}</p>
                </div>
              </div>

              <div className="flex-1 px-4 py-3.5">
                <p className="mb-2.5 font-mono text-[8px] uppercase tracking-[0.1em] text-[#A09D98]">
                  Recommended Actions
                </p>
                <div className="flex flex-col gap-2">
                  {dimData.actions.map((action, index) => (
                    <div className="border border-[#E2DFD9] px-3 py-2.5" key={action.title}>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <div
                            className="h-[5px] w-[5px] shrink-0 rounded-full"
                            style={{ background: ACTION_COLORS[index] ?? C.blue }}
                          />
                          <span className="truncate text-[11.5px] font-medium text-[#0D0E12]">{action.title}</span>
                        </div>
                        <Link
                          className={`shrink-0 px-2 py-1 text-[9.5px] font-semibold ${
                            index === 0
                              ? "bg-[#0071CE] text-white"
                              : "border border-[#D4D1CB] text-[#3D3C38]"
                          }`}
                          href={action.href}
                        >
                          Go →
                        </Link>
                      </div>
                      <p className="pl-3 text-[10.5px] text-[#7A7772]">{action.description}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-3.5 border-t border-[#E2DFD9] pt-3.5">
                  <button
                    className="flex w-full items-center justify-center gap-1.5 bg-[#00143A] px-3 py-2.5 text-[11px] font-semibold text-white"
                    onClick={() => onOpenProfile?.(selectedRow.userId)}
                    type="button"
                  >
                    Open {selectedRow.firstName}&apos;s profile
                  </button>
                </div>
              </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
