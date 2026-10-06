import { StatusPill } from "@/components/ui/status-pill";
import { TableCard, rowHighlight, tdCls, thCls, TwoLineCell } from "@/components/ui/table";
import { Profile, UserPlan } from "@/lib/types";
import { cn } from "@/lib/utils";

function quarterLabel(date: string) {
  const month = new Date(date).getMonth();
  const year = new Date(date).getFullYear();
  const quarter = Math.floor(month / 3) + 1;
  return `Q${quarter} ${year}`;
}

function firstNames(members: Profile[]) {
  const names = members.map((member) => member.fullName.split(" ")[0] ?? member.fullName);
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
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
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-xl font-extrabold text-ink">Cohort view</h2>
        <p className="mt-1 text-sm text-muted">New hires grouped by plan start quarter, so you can see who is on track.</p>
      </div>
      {sorted.length === 0 ? (
        <p className="rounded-[14px] border border-line bg-white px-5 py-6 text-sm text-muted">No team members in scope yet.</p>
      ) : (
        <TableCard minWidth={640}>
          <thead>
            <tr>
              <th className={thCls} scope="col">
                Cohort
              </th>
              <th className={thCls} scope="col">
                Status
              </th>
              <th className={cn(thCls, "w-[260px] text-right")} scope="col">
                Avg progress
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(([label, cohort]) => {
              const onTrack = cohort.plans.filter((plan) => plan.progress >= 50 || plan.status === "completed").length;
              const total = cohort.members.length;
              const avgProgress = cohort.plans.length
                ? Math.round(cohort.plans.reduce((sum, plan) => sum + plan.progress, 0) / cohort.plans.length)
                : 0;
              const healthy = onTrack >= total * 0.75;
              const low = avgProgress < 60;

              return (
                <tr className={healthy ? undefined : rowHighlight.danger} key={label}>
                  <td className={tdCls}>
                    <TwoLineCell subline={firstNames(cohort.members)} title={label} />
                  </td>
                  <td className={tdCls}>
                    <StatusPill tone={healthy ? "success" : "danger"}>
                      {onTrack} of {total} on track
                    </StatusPill>
                  </td>
                  <td className={tdCls}>
                    <span className="flex items-center justify-end gap-3">
                      <span
                        aria-label={`Average progress ${avgProgress}%`}
                        aria-valuemax={100}
                        aria-valuemin={0}
                        aria-valuenow={avgProgress}
                        className="h-2 w-[140px] overflow-hidden rounded-[4px] bg-track"
                        role="progressbar"
                      >
                        <span
                          className={cn("block h-full rounded-[4px]", low ? "bg-danger" : "bg-blue")}
                          style={{ width: `${avgProgress}%` }}
                        />
                      </span>
                      <span
                        className={cn(
                          "num w-[52px] text-right text-[20px] leading-none font-extrabold tracking-[-0.03em]",
                          low ? "text-danger" : "text-blue",
                        )}
                      >
                        {avgProgress}%
                      </span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableCard>
      )}
    </section>
  );
}
