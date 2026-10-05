"use client";

import { Tag } from "@/components/ui/tag";
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
      <div className="shrink-0 border-b border-line bg-surface-2 px-5 py-2.5">
        <span className="label-mono">
          <span aria-hidden="true" className="text-success">
            ✓{" "}
          </span>
          AI Scheduling Intelligence · No issues detected
        </span>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-b border-line bg-surface-2">
      <div className="flex items-center justify-between gap-3 px-5 pt-2.5">
        <span className="label-mono">
          <span aria-hidden="true" className="text-danger">
            ▲{" "}
          </span>
          AI Scheduling Intelligence · {active.length} issue{active.length === 1 ? "" : "s"} detected
        </span>
        <button className="link text-xs" onClick={onDismissAll} type="button">
          Dismiss all
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2.5 px-5 pb-3 pt-2 md:grid-cols-3">
        {active.map((conflict) => {
          const style = CONFLICT_SEV_STYLES[conflict.severity];
          return (
            <div className="rounded-[14px] border border-line bg-white px-3.5 py-2.5" key={conflict.id}>
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold leading-tight text-ink">{conflict.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Tag tone={style.tone}>
                      <span aria-hidden="true">{style.symbol}</span>
                      {style.label}
                    </Tag>
                    <span className="font-mono text-xs text-muted">{conflict.seName}</span>
                  </div>
                </div>
                <button
                  aria-label={`Dismiss ${conflict.title}`}
                  className="text-lg leading-none text-muted hover:text-ink"
                  onClick={() => onDismiss(conflict.id)}
                  type="button"
                >
                  ×
                </button>
              </div>
              <p className="mb-2 text-[13px] leading-snug text-ink-2">{conflict.msg}</p>
              <button className="link text-[13px]" onClick={() => onCta(conflict)} type="button">
                {conflict.ctaLabel} →
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
