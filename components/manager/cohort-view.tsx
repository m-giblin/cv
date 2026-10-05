import { Tag } from "@/components/ui/tag";
import { Profile, UserPlan } from "@/lib/types";

function quarterLabel(date: string) {
  const month = new Date(date).getMonth();
  const year = new Date(date).getFullYear();
  const quarter = Math.floor(month / 3) + 1;
  return `Q${quarter} ${year}`;
}

export function ManagerCohortView({
  org,
  plans,
}: {
  org: Profile[];
  plans: UserPlan[];
}) {
  const cohorts = new Map<string, { members: Profile[]; plans: UserPlan[] }>();

  for (const profile of org) {
    const plan = plans.find((item) => item.userId === profile.id);
    const key = plan?.startDate ? quarterLabel(plan.startDate) : "Unassigned";
    const existing = cohorts.get(key) ?? { members: [], plans: [] };
    existing.members.push(profile);
    if (plan) {
      existing.plans.push(plan);
    }
    cohorts.set(key, existing);
  }

  const sorted = [...cohorts.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <section className="overflow-hidden rounded-[14px] border border-line bg-white">
      <div className="border-b border-divider px-5 py-4">
        <h2 className="text-lg font-extrabold text-ink">Cohort view</h2>
        <p className="mt-1 text-sm text-muted">
          New hires grouped by plan start quarter, so you can see who is on track.
        </p>
      </div>
      {sorted.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">No team members in scope yet.</p>
      ) : (
        <ul>
          {sorted.map(([label, cohort]) => {
            const onTrack = cohort.plans.filter(
              (plan) => plan.progress >= 50 || plan.status === "completed",
            ).length;
            const total = cohort.members.length;
            const avgProgress = cohort.plans.length
              ? Math.round(
                  cohort.plans.reduce((sum, plan) => sum + plan.progress, 0) / cohort.plans.length,
                )
              : 0;
            const healthy = onTrack >= total * 0.75;

            return (
              <li className="border-b border-divider px-5 py-4 last:border-b-0" key={label}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-sm font-medium uppercase text-ink">{label}</p>
                  <Tag tone={healthy ? "success" : "warning"}>
                    {healthy ? "●" : "▲"} {onTrack} of {total} on track
                  </Tag>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div
                    aria-label={`Average progress ${avgProgress}%`}
                    aria-valuemax={100}
                    aria-valuemin={0}
                    aria-valuenow={avgProgress}
                    className="h-2 flex-1 overflow-hidden rounded-full bg-divider"
                    role="progressbar"
                  >
                    <div
                      className={`h-full rounded-full ${avgProgress < 60 ? "bg-danger" : "bg-blue"}`}
                      style={{ width: `${avgProgress}%` }}
                    />
                  </div>
                  <span
                    className={`text-[22px] font-extrabold leading-none tracking-[-0.03em] ${
                      avgProgress < 60 ? "text-danger" : "text-blue"
                    }`}
                  >
                    {avgProgress}%
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted">
                  Avg. progress {avgProgress}% · {cohort.members.map((m) => m.fullName.split(" ")[0]).join(", ")}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
