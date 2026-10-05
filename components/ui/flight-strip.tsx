import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type LifecycleStage = "done" | "current" | "upcoming";

/**
 * Boarding-pass style strip for the next step: blue stub with a big numeral, perforated
 * (dashed) edge, optional three-cell lifecycle row, then the body.
 */
export function FlightStrip({
  stubLabel = "NEXT STEP",
  numeral,
  numeralCaption,
  lifecycle,
  compact = false,
  children,
  className,
}: {
  stubLabel?: string;
  numeral: ReactNode;
  numeralCaption?: ReactNode;
  lifecycle?: { label: string; stage: LifecycleStage }[];
  compact?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid overflow-hidden rounded-[14px] border-[1.5px] border-ink bg-white",
        compact ? "grid-cols-[72px_minmax(0,1fr)]" : "grid-cols-[120px_minmax(0,1fr)]",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-col justify-between bg-blue text-white",
          compact ? "px-3 py-3" : "px-4 py-[18px]",
        )}
      >
        <span className="font-mono text-xs text-signal">{stubLabel}</span>
        <div className="flex flex-col">
          <span
            className={cn(
              "leading-[0.85] font-extrabold tracking-[-0.04em]",
              compact ? "text-[34px]" : "text-[64px]",
            )}
          >
            {numeral}
          </span>
          {numeralCaption ? (
            <span className="mt-1 font-mono text-xs text-on-blue-muted">{numeralCaption}</span>
          ) : null}
        </div>
      </div>
      <div className="-ml-0.5 flex min-w-0 flex-col border-l-2 border-dashed border-line-strong">
        {lifecycle ? (
          <div className="grid grid-cols-3 border-b-[1.5px] border-divider font-mono text-xs font-medium">
            {lifecycle.map((cell) => (
              <span
                className={cn(
                  "truncate px-3 py-[9px] whitespace-nowrap sm:px-[18px]",
                  cell.stage === "done" && "text-blue",
                  cell.stage === "current" && "bg-signal text-ink",
                  cell.stage === "upcoming" && "text-[#5A6884]",
                )}
                key={cell.label}
              >
                {cell.label}
              </span>
            ))}
          </div>
        ) : null}
        <div className="flex flex-col gap-2.5 px-6 pt-4 pb-5">{children}</div>
      </div>
    </div>
  );
}
