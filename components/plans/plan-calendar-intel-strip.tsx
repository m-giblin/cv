"use client";

import { X } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
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
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-line px-5 py-3">
        <span className="label-caps">Scheduling check</span>
        <StatusPill tone="success">No issues found</StatusPill>
      </div>
    );
  }

  return (
    <section aria-label="Scheduling check" className="shrink-0 border-b border-line bg-bg">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="label-caps">Scheduling check</span>
          <StatusPill tone="danger">
            {active.length} {active.length === 1 ? "issue" : "issues"} found
          </StatusPill>
        </div>
        <button className="link text-sm" onClick={onDismissAll} type="button">
          Dismiss all
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 px-5 pt-2.5 pb-3.5 md:grid-cols-3">
        {active.map((conflict) => {
          const style = CONFLICT_SEV_STYLES[conflict.severity];
          return (
            <div className="flex flex-col gap-2 rounded-[14px] border border-line bg-white px-4 py-3" key={conflict.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-[15px] leading-snug font-bold text-ink">{conflict.title}</span>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <StatusPill tone={style.tone}>{style.label}</StatusPill>
                    <span className="text-[13px] text-muted">{conflict.seName}</span>
                  </span>
                </div>
                <button
                  aria-label={`Dismiss ${conflict.title}`}
                  className="-mr-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted hover:bg-divider hover:text-ink"
                  onClick={() => onDismiss(conflict.id)}
                  type="button"
                >
                  <X aria-hidden className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm leading-normal text-ink-2">{conflict.msg}</p>
              <button className="link self-start text-sm" onClick={() => onCta(conflict)} type="button">
                {conflict.ctaLabel}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
