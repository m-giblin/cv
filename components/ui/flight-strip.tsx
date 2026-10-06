import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type LifecycleStage = "done" | "current" | "upcoming";

function StageDot({ stage }: { stage: LifecycleStage }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full",
        stage === "done" && "bg-blue",
        stage === "current" && "border-2 border-blue",
        stage === "upcoming" && "border-[1.5px] border-line-strong",
      )}
    >
      {stage === "done" ? (
        <span className="block h-2 w-1 -translate-y-px rotate-45 border-r-2 border-b-2 border-white" />
      ) : null}
      {stage === "current" ? <span className="h-1.5 w-1.5 rounded-full bg-blue" /> : null}
    </span>
  );
}

/** Requested → In progress → Validated. */
export function LifecycleStepper({ stages }: { stages: { label: string; stage: LifecycleStage }[] }) {
  return (
    <ol className="flex items-center gap-2.5">
      {stages.map((cell, index) => (
        <li className="flex min-w-0 flex-1 items-center gap-2.5 last:flex-none" key={cell.label}>
          <span className="flex items-center gap-2 text-[13px] font-semibold whitespace-nowrap">
            <StageDot stage={cell.stage} />
            <span className={cell.stage === "upcoming" ? "text-muted" : cell.stage === "current" ? "text-blue" : "text-ink"}>
              {cell.label}
            </span>
            <span className="sr-only">
              {cell.stage === "done" ? " (done)" : cell.stage === "current" ? " (current)" : " (not started)"}
            </span>
          </span>
          {index < stages.length - 1 ? <span aria-hidden className="h-px min-w-4 flex-1 bg-line" /> : null}
        </li>
      ))}
    </ol>
  );
}

/**
 * Step card ("flight strip"): blue stub with a big numeral, dashed perforation, then the body.
 */
export function FlightStrip({
  stubLabel = "Next step",
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
        "grid overflow-hidden rounded-[14px] border border-line bg-white shadow-[var(--shadow-card)]",
        compact ? "grid-cols-[72px_minmax(0,1fr)]" : "grid-cols-[110px_minmax(0,1fr)] max-sm:grid-cols-[84px_minmax(0,1fr)]",
        className,
      )}
    >
      <div className={cn("flex flex-col justify-between bg-blue text-white", compact ? "px-3 py-3.5" : "px-4 py-5")}>
        <span className="text-[11px] font-bold tracking-[0.08em] whitespace-nowrap text-signal uppercase">{stubLabel}</span>
        <span className="flex flex-col">
          <span className={cn("num leading-[0.85] font-extrabold tracking-[-0.04em]", compact ? "text-[34px]" : "text-[56px]")}>
            {numeral}
          </span>
          {numeralCaption ? <span className="mt-1.5 text-[13px] text-on-blue">{numeralCaption}</span> : null}
        </span>
      </div>
      <div
        className={cn(
          "-ml-0.5 flex min-w-0 flex-col gap-3.5 border-l-2 border-dashed border-line",
          compact ? "px-4 py-3.5" : "px-6 py-5",
        )}
      >
        {lifecycle ? <LifecycleStepper stages={lifecycle} /> : null}
        {children}
      </div>
    </div>
  );
}

export { FlightStrip as StepCard };
