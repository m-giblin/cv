import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
 <Card>
 <CardHeader>
 <CardTitle>Cohort view</CardTitle>
 <CardDescription>New hires grouped by plan start quarter — track who is on track.</CardDescription>
 </CardHeader>
 <div className="space-y-4">
 {sorted.map(([label, cohort]) => {
 const onTrack = cohort.plans.filter((plan) => plan.progress >= 50 || plan.status === "completed").length;
 const total = cohort.members.length;
 const avgProgress = cohort.plans.length
 ? Math.round(cohort.plans.reduce((sum, plan) => sum + plan.progress, 0) / cohort.plans.length)
 : 0;

 return (
 <div className="border border-sp-blue/10 p-4" key={label}>
 <div className="flex flex-wrap items-center justify-between gap-2">
 <p className="font-bold text-sp-navy">{label}</p>
 <Badge tone={onTrack >= total * 0.75 ? "green" : "amber"}>
 {onTrack} of {total} on track
 </Badge>
 </div>
 <Progress className="mt-3" value={avgProgress} />
 <p className="mt-2 text-xs text-sp-navy-muted">
 Avg. progress {avgProgress}% • {cohort.members.map((m) => m.fullName.split(" ")[0]).join(", ")}
 </p>
 </div>
 );
 })}
 </div>
 </Card>
 );
}
