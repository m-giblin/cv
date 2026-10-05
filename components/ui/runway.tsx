import { Fragment } from "react";
import { cn } from "@/lib/utils";

export type RunwaySegment = {
  label: string;
  weeks: number;
  /** Gate at the end of this segment has been passed. */
  gatePassed?: boolean;
};

/**
 * 13-week runway: done weeks blue, current week signal with an ink outline, future weeks dashed.
 * Diamonds mark the gate at the end of each segment.
 */
export function Runway({
  segments,
  currentWeek,
  endLabel = "FIELD READY",
  className,
}: {
  segments: RunwaySegment[];
  /** 1-based. */
  currentWeek: number;
  endLabel?: string;
  className?: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.weeks, 0);
  let week = 0;
  const currentSegment = (() => {
    let acc = 0;
    for (let i = 0; i < segments.length; i += 1) {
      acc += segments[i]!.weeks;
      if (currentWeek <= acc) return i;
    }
    return segments.length - 1;
  })();
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div
      aria-label={`Week ${currentWeek} of ${total}`}
      className={cn("flex flex-col gap-1.5", className)}
      role="img"
    >
      <div
        className="grid gap-1.5 font-mono text-xs text-muted uppercase"
        style={{ gridTemplateColumns: segments.map((s) => `${s.weeks}fr`).join(" ") }}
      >
        {segments.map((segment, index) => (
          <span className={index === currentSegment ? "font-medium text-ink" : undefined} key={segment.label}>
            {segment.label}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-1">
        {segments.map((segment) => (
          <Fragment key={segment.label}>
            {Array.from({ length: segment.weeks }, () => {
              week += 1;
              const n = week;
              return (
                <div
                  className={cn(
                    "h-3 flex-1 rounded-[4px]",
                    n < currentWeek && "bg-blue",
                    n === currentWeek && "bg-signal outline-2 outline-offset-2 outline-ink",
                    n > currentWeek && "border-[1.5px] border-dashed border-dash",
                  )}
                  key={n}
                />
              );
            })}
            <div
              className={cn(
                "mx-0.5 h-2.5 w-2.5 shrink-0 rotate-45",
                segment.gatePassed ? "bg-blue" : "border-2 border-blue",
              )}
            />
          </Fragment>
        ))}
      </div>
      <div className="relative flex font-mono text-xs whitespace-nowrap text-muted">
        <span>W01</span>
        <span
          className="absolute font-medium text-ink"
          style={{ left: `calc(${((currentWeek - 1) / total) * 100}% )` }}
        >
          ▲ W{pad(currentWeek)} · YOU ARE HERE
        </span>
        <span className="ml-auto">
          W{pad(total)} · {endLabel}
        </span>
      </div>
    </div>
  );
}
