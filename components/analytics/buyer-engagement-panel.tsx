"use client";

import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Metric = { label: string; value: number | string; delta: string };

export function BuyerEngagementPanel({ accountName }: { accountName?: string }) {
  const [metrics, setMetrics] = useState<Metric[]>([
    { label: "Deal prep briefs opened", value: 0, delta: "Loading…" },
    { label: "Resource links shared", value: 0, delta: "—" },
    { label: "Total engagements", value: 0, delta: "—" },
  ]);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/engagement");
      if (!response.ok) return;
      const body = (await response.json()) as { metrics: Metric[] };
      setMetrics(body.metrics);
    })();
  }, []);

  useEffect(() => {
    if (!accountName) return;
    void fetch("/api/engagement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resourceLabel: "Deal prep brief",
        accountName,
        eventType: "view_brief",
      }),
    });
  }, [accountName]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4 text-sp-blue" />
          Buyer engagement analytics
        </CardTitle>
        <CardDescription>
          Tracks brief views and resource shares — Seismic/Highspot-style engagement without CRM sync yet.
        </CardDescription>
      </CardHeader>
      <div className="grid gap-3 sm:grid-cols-3">
        {metrics.map((metric) => (
          <div className="rounded-xl border border-sp-blue/10 bg-sp-blue-soft/10 p-3" key={metric.label}>
            <p className="text-[11px] font-semibold uppercase text-sp-navy-muted">{metric.label}</p>
            <p className="mt-1 text-xl font-bold text-sp-navy">{metric.value}</p>
            <p className="text-xs text-sp-navy-muted">{metric.delta}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
