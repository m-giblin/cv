"use client";

import { useEffect, useState } from "react";
import { EmptyState, KpiStrip, LineCard, LoadingState, Mono, Notice } from "@/components/admin/admin-ui";
import type { AnalyticsData } from "@/lib/data/get-analytics-data";

type ManagerProgressRow = {
 managerName: string;
 avgProgress: number;
 seCount: number;
 planCount: number;
};

type ExtendedAnalytics = AnalyticsData & {
 simTrend?: number[];
 managerProgress?: ManagerProgressRow[];
};

function sparklinePath(data: number[]) {
 const w = 700;
 const h = 70;
 const pad = 5;
 const minV = Math.min(...data);
 const maxV = Math.max(...data);
 const pts = data.map((avg, i) => {
 const x = (i / (data.length - 1)) * w;
 const y = h - pad - ((avg - minV) / (maxV - minV || 1)) * (h - pad * 2);
 return [x, y] as const;
 });
 return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
}

export function AnalyticsDashboard() {
 const [data, setData] = useState<ExtendedAnalytics | null>(null);
 const [isLoading, setIsLoading] = useState(true);

 useEffect(() => {
 void fetch("/api/admin/analytics")
 .then((response) => response.json())
 .then((body: ExtendedAnalytics) => {
 setData(body);
 setIsLoading(false);
 })
 .catch(() => setIsLoading(false));
 }, []);

 if (isLoading) {
 return <LoadingState label="Loading analytics…" />;
 }

 if (!data) {
 return <Notice>Analytics unavailable.</Notice>;
 }

 const managerRows = data.managerProgress ?? [];
 const simTrend = data.simTrend ?? [];
 const latestAvg = simTrend.length > 0 ? simTrend[simTrend.length - 1]! : 0;
 const priorAvg = simTrend.length > 1 ? simTrend[simTrend.length - 2]! : latestAvg;
 const trend = latestAvg - priorAvg;

 return (
 <div className="flex flex-col gap-6">
 <KpiStrip
 items={[
 { label: "Total users", value: data.totalUsers },
 { label: "Active plans", value: data.activePlans },
 { label: "Pending reviews", value: data.pendingReviews },
 {
 label: "Avg time-to-ready",
 value: data.avgDaysToComplete !== null ? data.avgDaysToComplete : "—",
 suffix: data.avgDaysToComplete !== null ? "d" : undefined,
 },
 ]}
 />

 <div className="grid items-start gap-6 lg:grid-cols-2">
 <LineCard meta="Ramp completeness" title="Avg plan progress by manager">
 {managerRows.length === 0 ? (
 <EmptyState className="py-4">No manager cohort data available.</EmptyState>
 ) : (
 <ul className="flex flex-col gap-4">
 {managerRows.map((row) => (
 <li key={row.managerName}>
 <div className="mb-1.5 flex items-baseline justify-between gap-3">
 <span className="text-sm font-bold text-ink">{row.managerName}</span>
 <span className="text-[15px] font-extrabold text-blue tabular-nums">{row.avgProgress}%</span>
 </div>
 <div
 aria-label={`${row.managerName} average plan progress`}
 aria-valuemax={100}
 aria-valuemin={0}
 aria-valuenow={row.avgProgress}
 className="h-2 overflow-hidden rounded-full bg-divider"
 role="progressbar"
 >
 <div className="h-full rounded-full bg-blue" style={{ width: `${row.avgProgress}%` }} />
 </div>
 <Mono className="mt-1 block text-muted">
 {row.seCount} SEs · {row.planCount} plans
 </Mono>
 </li>
 ))}
 </ul>
 )}
 </LineCard>

 <LineCard meta="Certification gates" title="Field readiness">
 <dl className="grid grid-cols-1 overflow-hidden rounded-[10px] border border-line sm:grid-cols-3">
 {[
 { label: "Clearance rate", value: `${data.certClearanceRate}%` },
 { label: "Gates cleared", value: data.certApprovedTotal },
 { label: "Pending sign-offs", value: data.certPendingSignoffs },
 ].map((stat) => (
 <div
 className="flex flex-col gap-1 border-b border-divider px-4 py-3.5 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0"
 key={stat.label}
 >
 <dt className="label-mono">{stat.label}</dt>
 <dd className="text-[28px] leading-none font-extrabold tracking-[-0.03em] text-blue">{stat.value}</dd>
 </div>
 ))}
 </dl>
 <div className="mt-4">
 <div className="mb-1.5 flex items-baseline justify-between">
 <span className="text-sm text-ink-2">Gate clearance across the org</span>
 <span className="text-[15px] font-extrabold text-blue tabular-nums">{data.certClearanceRate}%</span>
 </div>
 <div
 aria-label="Gate clearance rate"
 aria-valuemax={100}
 aria-valuemin={0}
 aria-valuenow={data.certClearanceRate}
 className="h-2 overflow-hidden rounded-full bg-divider"
 role="progressbar"
 >
 <div
 className="h-full rounded-full bg-blue"
 style={{ width: `${Math.min(100, Math.max(0, data.certClearanceRate))}%` }}
 />
 </div>
 </div>
 </LineCard>
 </div>

 <LineCard
 actions={
 simTrend.length >= 2 ? (
 <p className="flex items-baseline gap-2">
 <span className="text-2xl font-extrabold text-blue tabular-nums">{latestAvg}</span>
 <span className={`font-mono text-xs font-medium ${trend >= 0 ? "text-success" : "text-danger"}`}>
 {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}
 </span>
 </p>
 ) : null
 }
 meta="4-week rolling avg"
 title="Simulation score trend"
 >
 {simTrend.length >= 2 ? (
 <svg
 aria-label={`Simulation score trend, latest ${latestAvg}`}
 height="70"
 preserveAspectRatio="none"
 role="img"
 viewBox="0 0 700 70"
 width="100%"
 >
 <path
 d={sparklinePath(simTrend)}
 fill="none"
 stroke="var(--color-blue)"
 strokeLinecap="round"
 strokeWidth="2.5"
 vectorEffect="non-scaling-stroke"
 />
 </svg>
 ) : (
 <EmptyState className="py-4">
 Sim trend data is not available yet — scores will appear after coaching cards are reviewed.
 </EmptyState>
 )}
 </LineCard>
 </div>
 );
}
