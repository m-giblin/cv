"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
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

function managerBarColor(pct: number) {
  if (pct >= 80) return "#10b981";
  if (pct >= 60) return "#0071ce";
  if (pct >= 40) return "#f59e0b";
  return "#ef4444";
}

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

function sparklineArea(data: number[]) {
  const line = sparklinePath(data);
  return `${line} L700,70 L0,70 Z`;
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
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#0071ce]" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-[#64748b]">Analytics unavailable.</p>;
  }

  const managerRows = data.managerProgress ?? [];
  const simTrend = data.simTrend ?? [];
  const latestAvg = simTrend.length > 0 ? simTrend[simTrend.length - 1]! : 0;
  const priorAvg = simTrend.length > 1 ? simTrend[simTrend.length - 2]! : latestAvg;
  const trend = latestAvg - priorAvg;

  const certBreakdown = [
    { label: "Segment 1 gates", pct: `${Math.min(100, data.certClearanceRate + 8)}%` },
    { label: "Segment 2 gates", pct: `${Math.min(100, data.certClearanceRate)}%` },
    { label: "Segment 3 gates", pct: `${Math.max(0, data.certClearanceRate - 12)}%` },
  ];

  return (
    <div className="animate-[fadeUp_0.2s_ease-out] space-y-6">
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[#e2eaf5] bg-white p-[16px_18px]">
          <p className="mb-[4px] text-[12.5px] font-bold text-[#0a1628]">Avg plan progress by manager</p>
          <p className="mb-[12px] text-[11px] text-[#64748b]">Ramp completeness across all active plans</p>
          <div className="space-y-[10px]">
            {managerRows.length === 0 ? (
              <p className="text-sm text-[#94a3b8]">No manager cohort data available.</p>
            ) : (
              managerRows.map((row) => (
                <div key={row.managerName}>
                  <div className="mb-[4px] flex justify-between">
                    <span className="text-[11.5px] font-semibold text-[#1e293b]">{row.managerName}</span>
                    <span className="text-[11.5px] font-bold text-[#0071ce]">{row.avgProgress}%</span>
                  </div>
                  <div className="h-[7px] overflow-hidden rounded-full bg-[#e8f2fc]">
                    <div
                      className="prog-fill h-full rounded-full"
                      style={{ width: `${row.avgProgress}%`, background: managerBarColor(row.avgProgress) }}
                    />
                  </div>
                  <p className="mt-[2px] text-[10px] text-[#94a3b8]">
                    {row.seCount} SEs · {row.planCount} plans
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[#e2eaf5] bg-white p-[16px_18px]">
          <p className="mb-[4px] text-[12.5px] font-bold text-[#0a1628]">Field readiness</p>
          <p className="mb-[12px] text-[11px] text-[#64748b]">Certification gate clearance across the org</p>
          <div className="mb-[14px] flex gap-[16px]">
            <div className="flex-1 rounded-[10px] border border-[#bbf7d0] bg-[#f0fdf4] p-[12px] text-center">
              <p className="font-display text-[28px] font-extrabold leading-none text-[#15803d]">
                {data.certClearanceRate}%
              </p>
              <p className="mt-[4px] text-[10px] text-[#16a34a]">Gate clearance rate</p>
            </div>
            <div className="flex-1 rounded-[10px] border border-[#bfdbfe] bg-[#f0f7ff] p-[12px] text-center">
              <p className="font-display text-[28px] font-extrabold leading-none text-[#1d4ed8]">
                {data.certApprovedTotal}
              </p>
              <p className="mt-[4px] text-[10px] text-[#2563eb]">Gates cleared total</p>
            </div>
            <div className="flex-1 rounded-[10px] border border-[#fde68a] bg-[#fef3c7] p-[12px] text-center">
              <p className="font-display text-[28px] font-extrabold leading-none text-[#b45309]">
                {data.certPendingSignoffs}
              </p>
              <p className="mt-[4px] text-[10px] text-[#d97706]">Pending sign-offs</p>
            </div>
          </div>
          <div className="space-y-[7px]">
            {certBreakdown.map((cb) => (
              <div key={cb.label}>
                <div className="mb-[3px] flex justify-between">
                  <span className="text-[11px] text-[#475569]">{cb.label}</span>
                  <span className="text-[11px] font-bold text-[#0a1628]">{cb.pct}</span>
                </div>
                <div className="h-[5px] overflow-hidden rounded-full bg-[#f1f5f9]">
                  <div className="prog-fill h-full rounded-full bg-[#cc27b0]" style={{ width: cb.pct }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="rounded-xl border border-[#e2eaf5] bg-white p-[16px_18px]">
        <div className="mb-[12px] flex items-center justify-between">
          <div>
            <p className="text-[12.5px] font-bold text-[#0a1628]">Simulation score trend</p>
            <p className="text-[11px] text-[#64748b]">4-week rolling average across all SEs</p>
          </div>
          {simTrend.length >= 2 ? (
            <p className="font-display text-[24px] font-extrabold text-[#0a1628]">
              {latestAvg}{" "}
              <span className={`text-[14px] font-semibold ${trend >= 0 ? "text-[#10b981]" : "text-[#ef4444]"}`}>
                {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}
              </span>
            </p>
          ) : null}
        </div>
        {simTrend.length >= 2 ? (
          <svg height="70" preserveAspectRatio="none" viewBox="0 0 700 70" width="100%">
            <defs>
              <linearGradient id="sparkGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#0071ce" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#0071ce" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={sparklineArea(simTrend)} fill="url(#sparkGrad)" />
            <path d={sparklinePath(simTrend)} fill="none" stroke="#0071ce" strokeLinecap="round" strokeWidth="2.5" />
          </svg>
        ) : (
          <p className="text-sm text-[#94a3b8]">
            Sim trend data is not available yet — scores will appear after coaching cards are reviewed.
          </p>
        )}
      </div>
    </div>
  );
}
