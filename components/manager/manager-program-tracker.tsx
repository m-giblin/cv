import { buildProgramTrackerRows } from "@/lib/plans/ramp-week";
import type { UserPlan } from "@/lib/types";

export function ManagerProgramTracker({
  teamIds,
  plans,
}: {
  teamIds: string[];
  plans: UserPlan[];
}) {
  const rows = buildProgramTrackerRows(teamIds, plans);

  if (rows.length === 0) {
    return (
      <div className="ns-card ns-card-blue p-4">
        <h2 className="text-sm font-bold text-stone-900">Program tracker</h2>
        <p className="mt-2 text-xs text-stone-600">Assign week-based ramp templates to see team progress by stage.</p>
      </div>
    );
  }

  return (
    <div className="ns-card ns-card-blue p-4">
      <h2 className="text-sm font-bold text-stone-900">Program tracker</h2>
      <p className="text-xs text-stone-500">Progress by onboarding stage across your team</p>
      <div className="mt-4 space-y-4">
        {rows.map((row) => (
          <div key={row.stageName}>
            <div className="flex justify-between gap-2 text-xs">
              <span className="font-semibold text-stone-900">
                {row.shortLabel} — {row.stageName.replace(/^Week\s+\d+[–-]\d+\s*—\s*/i, "")}
              </span>
              <span className="shrink-0 text-stone-500">
                {row.complete}/{row.assigned || row.teamSize} complete
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-[#0033a1]"
                style={{
                  width: `${row.assigned > 0 ? Math.round((row.complete / row.assigned) * 100) : 0}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
