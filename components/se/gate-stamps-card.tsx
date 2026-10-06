import Link from "next/link";
import { Stamp } from "@/components/ui/stamp";
import { CAREER_STAGES } from "@/lib/growth/career-readiness";
import { badgeStampState, nextGate, type GateRow } from "@/lib/se/gate-matrix";
import type { SeLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

/** "Basic to Senior" for a level, or null at the top of the ladder. */
export function nextLevelTitle(level: SeLevel): string | null {
  const index = CAREER_STAGES.findIndex((stage) => stage.level === level);
  const next = CAREER_STAGES[index + 1]?.level;
  return next ? `${level} to ${next}` : null;
}

/** Today rail (artboard 1a): the career gates as 44px stamps with a one-line next step. */
export function GateStampsCard({ rows, level }: { rows: GateRow[]; level: SeLevel }) {
  const cleared = rows.filter((row) => row.status === "cleared").length;
  const next = nextGate(rows);
  return (
    <section
      aria-labelledby="gate-stamps-title"
      className="flex flex-col gap-4 rounded-[14px] border border-line bg-white px-[22px] py-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="label-caps" id="gate-stamps-title">
          {nextLevelTitle(level) ?? "Certification gates"}
        </h2>
        <span className="text-sm text-muted">
          <b className="num text-ink">
            {cleared} of {rows.length}
          </b>{" "}
          gates cleared
        </span>
      </div>
      <ul className="flex">
        {rows.map((row) => {
          const state = badgeStampState(row);
          return (
            <li className="flex flex-1 flex-col items-center gap-2" key={row.type}>
              <Stamp label={`${row.label}: ${row.status.replace("_", " ")}`} size={44} state={state} />
              <span
                className={cn(
                  "text-center text-[13px]",
                  state === "none" ? "font-medium text-muted" : "font-bold text-ink",
                )}
              >
                {row.short}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-divider pt-3.5 text-sm leading-normal text-ink-2">
        {next ? `${next.hint} ` : "Every gate is cleared. "}
        <Link className="link text-sm" href="/readiness/certification">
          {next?.status === "ready" ? "Submit evidence" : "View gates"}
        </Link>
      </p>
    </section>
  );
}
