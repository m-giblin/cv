import { Fragment } from "react";
import { cn } from "@/lib/utils";

export type RunwaySegment = {
  label: string;
  weeks: number;
  gatePassed?: boolean;
};

/**
 * 13-week runway. On paper: done blue, current amber with an ink outline, upcoming track.
 * On navy: done amber, current white, upcoming #2A3A63.
 */
export function Runway({
  segments,
  currentWeek,
  onNavy = false,
  showLabels = true,
  className,
}: {
  segments: RunwaySegment[];
  currentWeek: number;
  /** Kept for compatibility; the last segment label carries the destination. */
  endLabel?: string;
  onNavy?: boolean;
  showLabels?: boolean;
  className?: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.weeks, 0);
  let week = 0;
  let acc = 0;
  const currentSegment = segments.findIndex((segment) => {
    acc += segment.weeks;
    return currentWeek <= acc;
  });

  return (
    <div aria-label={`Week ${currentWeek} of ${total}`} className={cn("flex flex-col gap-2", className)} role="img">
      <div className="flex items-center gap-1">
        {segments.map((segment, s) => (
          <Fragment key={segment.label}>
            {s > 0 ? <span className="w-1" /> : null}
            {Array.from({ length: segment.weeks }, () => {
              week += 1;
              const n = week;
              return (
                <div
                  className={cn(
                    "h-2 flex-1 rounded-[2px]",
                    onNavy
                      ? n < currentWeek
                        ? "bg-signal"
                        : n === currentWeek
                          ? "bg-white"
                          : "bg-[#2A3A63]"
                      : n < currentWeek
                        ? "bg-blue"
                        : n === currentWeek
                          ? "bg-signal outline-2 outline-offset-1 outline-ink"
                          : "bg-track",
                  )}
                  key={n}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
      {showLabels ? (
        <div
          className={cn("grid gap-2 text-[13px]", onNavy ? "text-on-navy-muted" : "text-muted")}
          style={{ gridTemplateColumns: segments.map((s) => `${s.weeks}fr`).join(" ") }}
        >
          {segments.map((segment, index) => (
            <span
              className={cn(
                "truncate",
                index === currentSegment && (onNavy ? "font-bold text-white" : "font-bold text-ink"),
                index === segments.length - 1 && "text-right",
              )}
              key={segment.label}
            >
              {segment.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
