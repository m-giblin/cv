"use client";

import Link from "next/link";
import { AlertTriangle, Clock, UserX } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/metric-card";
import type { AccountabilityMetrics } from "@/lib/development/plan-utils";

function AccountabilityList({
 title,
 items,
 icon: Icon,
}: {
 title: string;
 items: AccountabilityMetrics["inactiveSes"];
 icon: typeof UserX;
}) {
 if (items.length === 0) {
 return null;
 }

 return (
 <Card className="border-amber-200/80">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-base text-amber-900">
 <Icon className="h-5 w-5" />
 {title}
 </CardTitle>
 </CardHeader>
 <div className="space-y-2">
 {items.map((item) => (
 <Link
 className="block border border-amber-200/60 bg-white p-3 text-sm transition hover:bg-amber-50"
 href={item.href}
 key={`${item.userId}-${item.reason}`}
 >
 <p className="font-bold text-sp-navy">{item.fullName}</p>
 <p className="mt-1 text-sp-navy-muted">{item.reason}</p>
 </Link>
 ))}
 </div>
 </Card>
 );
}

export function ManagerAccountabilityDashboard() {
 const [metrics, setMetrics] = useState<AccountabilityMetrics | null>(null);

 useEffect(() => {
 void fetch("/api/manager/accountability")
 .then((response) => response.json())
 .then((body: AccountabilityMetrics) => setMetrics(body));
 }, []);

 if (!metrics) {
 return null;
 }

 const attentionCount =
 metrics.inactiveSes.length +
 metrics.overdueGoalReviews.filter((item) => item.severity === "high").length +
 metrics.stuckPlanSteps.length;

 return (
 <section className="space-y-6">
 <div>
 <h2 className="text-xl font-bold text-sp-navy">Who needs you this week</h2>
 <p className="mt-1 text-sm text-sp-navy-muted">
 Accountability view — inactive SEs, overdue goal reviews, and stuck plan steps.
 </p>
 </div>

 <section className="grid gap-4 md:grid-cols-4">
 <MetricCard
 accent="magenta"
 helper="Submissions + coaching"
 icon={AlertTriangle}
 label="Pending reviews"
 value={`${metrics.pendingSubmissions + metrics.pendingCoachingCards}`}
 />
 <MetricCard
 helper="Quarterly checkpoints"
 icon={Clock}
 label="Overdue goal reviews"
 value={`${metrics.overdueReviewCount}`}
 />
 <MetricCard
 helper="No activity 14+ days"
 icon={UserX}
 label="Inactive SEs"
 value={`${metrics.inactiveSes.length}`}
 />
 <MetricCard
 accent="magenta"
 helper="Submission → feedback"
 icon={Clock}
 label="Avg review time"
 value={metrics.avgReviewDays !== null ? `${metrics.avgReviewDays}d` : "—"}
 />
 </section>

 {attentionCount > 0 ? (
 <div className="grid gap-4 lg:grid-cols-3">
 <AccountabilityList icon={UserX} items={metrics.inactiveSes} title="Inactive SEs" />
 <AccountabilityList icon={Clock} items={metrics.overdueGoalReviews} title="Goal reviews due / overdue" />
 <AccountabilityList icon={AlertTriangle} items={metrics.stuckPlanSteps} title="Stuck plan steps" />
 </div>
 ) : (
 <Card>
 <CardDescription className="p-6">Your team is on track — no overdue accountability items.</CardDescription>
 </Card>
 )}
 </section>
 );
}
