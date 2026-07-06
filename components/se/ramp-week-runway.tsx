import { buildWeekRunway, rampWeekLabel } from "@/lib/plans/ramp-week";
import type { UserPlan } from "@/lib/types";

export function RampWeekRunway({ plan, showAutoBadge = true }: { plan?: UserPlan; showAutoBadge?: boolean }) {
  if (!plan) return null;

  const runway = buildWeekRunway(plan);

  return (
    <div className="ns-card col-span-12 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#0033a1]">Ramp runway</p>
          <p className="text-sm text-stone-600">{rampWeekLabel(plan)}</p>
        </div>
        {showAutoBadge ? (
          <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[10px] font-semibold text-stone-600">
            Manager-assigned ramp
          </span>
        ) : null}
      </div>
      <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
        {runway.map((cell) => (
          <div className="min-w-[44px] flex-1" key={cell.week}>
            <div
              className={`h-2 rounded-full ${
                cell.status === "done"
                  ? "bg-[#0033a1]"
                  : cell.status === "current"
                    ? "bg-gradient-to-r from-[#0033a1] to-[#d70fb6]"
                    : "bg-stone-200"
              }`}
              title={`Week ${cell.week}`}
            />
            <p
              className={`mt-1.5 text-center text-[10px] font-semibold ${
                cell.status === "current" ? "text-[#0033a1]" : "text-stone-500"
              }`}
            >
              W{cell.week}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
