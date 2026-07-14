"use client";

import type { PlanCalendarConflict } from "@/lib/plans/plan-calendar-conflicts";
import { CONFLICT_SEV_STYLES } from "@/lib/plans/plan-calendar-colors";

export function PlanCalendarIntelStrip({
  conflicts,
  dismissedIds,
  onDismiss,
  onDismissAll,
  onCta,
}: {
  conflicts: PlanCalendarConflict[];
  dismissedIds: string[];
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
  onCta: (conflict: PlanCalendarConflict) => void;
}) {
  const active = conflicts.filter((c) => !dismissedIds.includes(c.id)).slice(0, 3);

  if (active.length === 0) {
    return (
      <div className="shrink-0 bg-[#00143A] px-5 py-2.5">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-[#0A6E45]" />
          <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-white/50">
            AI Scheduling Intelligence · No issues detected
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="shrink-0 bg-[#00143A]">
      <div className="flex items-center justify-between px-5 pt-[7px]">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#B83128]" />
          <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-white/50">
            AI Scheduling Intelligence · {active.length} issue{active.length === 1 ? "" : "s"} detected
          </span>
        </div>
        <button
          className="font-mono text-[8px] text-white/30 hover:text-white/50"
          onClick={onDismissAll}
          type="button"
        >
          Dismiss all
        </button>
      </div>
      <div className="flex px-5 pb-2.5 pt-1.5">
        {active.map((conflict) => {
          const style = CONFLICT_SEV_STYLES[conflict.severity];
          return (
            <div
              className="flex-1 border-r border-white/[0.08] px-3.5 py-2.5 last:border-r-0"
              key={conflict.id}
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="h-5 w-5 shrink-0 rounded-sm" style={{ background: style.iconBg }} />
                  <div>
                    <div className="text-[11px] font-semibold leading-tight text-white">{conflict.title}</div>
                    <div className="mt-0.5 font-mono text-[8px] tracking-wide" style={{ color: style.color }}>
                      {style.label} · {conflict.seName}
                    </div>
                  </div>
                </div>
                <button
                  className="text-[13px] leading-none text-white/25 hover:text-white/40"
                  onClick={() => onDismiss(conflict.id)}
                  type="button"
                >
                  ×
                </button>
              </div>
              <div className="mb-1.5 text-[10.5px] leading-snug text-white/55">{conflict.msg}</div>
              <button
                className="inline-flex items-center gap-1 px-2 py-0.5 font-mono text-[8.5px]"
                onClick={() => onCta(conflict)}
                style={{ background: style.ctaBg, color: style.ctaColor }}
                type="button"
              >
                {conflict.ctaLabel} →
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
