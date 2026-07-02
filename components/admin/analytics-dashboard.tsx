"use client";

import { BarChart3, Clock, Loader2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { MetricCard } from "@/components/metric-card";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { AnalyticsData } from "@/lib/data/get-analytics-data";

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/admin/analytics")
      .then((response) => response.json())
      .then((body: AnalyticsData) => {
        setData(body);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-sp-blue" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-sp-navy-muted">Analytics unavailable.</p>;
  }

  const completionRate =
    data.activePlans + data.completedPlans > 0
      ? Math.round((data.completedPlans / (data.activePlans + data.completedPlans)) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard helper="All profiles" icon={Users} label="Total users" value={`${data.totalUsers}`} />
        <MetricCard
          accent="magenta"
          helper={`${data.seCount} SEs • ${data.managerCount} managers`}
          icon={BarChart3}
          label="Active plans"
          value={`${data.activePlans}`}
        />
        <MetricCard
          helper="Submissions + coaching cards"
          icon={Clock}
          label="Pending reviews"
          value={`${data.pendingReviews}`}
        />
        <MetricCard
          accent="magenta"
          helper="Submitted this month"
          icon={BarChart3}
          label="Submissions"
          value={`${data.submissionsThisMonth}`}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Program health</CardTitle>
            <CardDescription>Completion and progress across all assignments.</CardDescription>
          </CardHeader>
          <div className="space-y-5">
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-sp-navy-muted">Plan completion rate</span>
                <span className="font-bold text-sp-blue">{completionRate}%</span>
              </div>
              <Progress value={completionRate} />
            </div>
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-sp-navy-muted">Average plan progress</span>
                <span className="font-bold text-sp-blue">{data.avgPlanProgress}%</span>
              </div>
              <Progress value={data.avgPlanProgress} />
            </div>
            <p className="text-sm text-sp-navy-muted">
              {data.completedPlans} completed • {data.activePlans} in progress
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Time to ready</CardTitle>
            <CardDescription>Average days from plan start to completion (completed plans only).</CardDescription>
          </CardHeader>
          <p className="text-4xl font-bold text-sp-navy">
            {data.avgDaysToComplete !== null ? `${data.avgDaysToComplete}d` : "—"}
          </p>
          <p className="mt-2 text-sm text-sp-navy-muted">
            {data.recentActivityCount} timeline events in the last 7 days
          </p>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Field readiness</CardTitle>
            <CardDescription>Certification gates cleared across the org.</CardDescription>
          </CardHeader>
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-sp-navy-muted">Gate clearance rate</span>
                <span className="font-bold text-sp-magenta">{data.certClearanceRate}%</span>
              </div>
              <Progress value={data.certClearanceRate} />
            </div>
            <p className="text-sm text-sp-navy-muted">
              {data.certApprovedTotal} gates cleared • {data.certPendingSignoffs} pending manager sign-off
            </p>
          </div>
        </Card>
      </section>
    </div>
  );
}
