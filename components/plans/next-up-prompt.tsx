"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { NextUpStep } from "@/lib/plans/next-up";

/**
 * Shown when a plan step is finished: offers the plan's next step right there, so the person doesn't
 * have to go back to their plan for it. "Later" just dismisses it; the step stays on Today and the plan.
 */
export function NextUpPrompt({
  next,
  onTake,
  onLater,
}: {
  next: NextUpStep;
  /** Open the step in place (a quiz over the chapter, say). Without it, the yes button follows the step's link. */
  onTake?: () => void;
  onLater: () => void;
}) {
  const yes = (
    <>
      {next.label} <ArrowRight aria-hidden className="h-4 w-4" />
    </>
  );
  return (
    <section
      aria-label="Next up"
      className="flex flex-col gap-3 rounded-[14px] border border-blue bg-blue-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      role="status"
    >
      <div className="min-w-0">
        <p className="m-0 text-[12px] font-bold uppercase tracking-wide text-blue">Next up on your plan</p>
        <p className="m-0 font-bold text-ink">
          {next.title}
          {next.passScore ? <span className="font-normal text-ink-2"> · pass at {next.passScore}%</span> : null}
        </p>
        <p className="m-0 text-[13px] text-ink-2">Do it now, or come back to it later from Today.</p>
      </div>
      <div className="flex shrink-0 gap-2">
        {onTake ? (
          <button className="btn-primary" onClick={onTake} type="button">
            {yes}
          </button>
        ) : (
          <Link className="btn-primary no-underline" href={next.href} onClick={onLater}>
            {yes}
          </Link>
        )}
        <button className="btn-secondary" onClick={onLater} type="button">
          Later
        </button>
      </div>
    </section>
  );
}
