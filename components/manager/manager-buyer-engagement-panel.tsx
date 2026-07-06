"use client";

import { BarChart3, Eye, Share2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type EngagementRow = {
  seName: string;
  accountName: string;
  eventType: string;
  resourceLabel: string;
  createdAt: string;
  source: "se" | "buyer";
};

export function ManagerBuyerEngagementPanel() {
  const [rows, setRows] = useState<EngagementRow[]>([]);
  const [summary, setSummary] = useState({ total: 0, accounts: 0, shares: 0, buyerViews: 0 });
  const [topSe, setTopSe] = useState<Array<{ seName: string; count: number }>>([]);

  useEffect(() => {
    void fetch("/api/engagement/team?days=14")
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (!body) return;
        setRows(body.rows ?? []);
        setSummary(body.summary ?? { total: 0, accounts: 0, shares: 0, buyerViews: 0 });
        setTopSe(body.topSe ?? []);
      });
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-5 w-5 text-sp-blue" />
          Buyer engagement intel
        </CardTitle>
        <CardDescription>
          SE activity plus real buyer opens on shared rooms — last 14 days. Seismic-style intel without the DSR tax.
        </CardDescription>
      </CardHeader>
      <div className="space-y-4 px-6 pb-6">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-sp-blue/10 bg-sp-blue-soft/20 p-3 text-center">
            <p className="text-2xl font-bold text-sp-navy">{summary.total}</p>
            <p className="text-xs text-sp-navy-muted">Total touches</p>
          </div>
          <div className="rounded-xl border border-sp-blue/10 bg-sp-blue-soft/20 p-3 text-center">
            <p className="flex items-center justify-center gap-1 text-2xl font-bold text-sp-navy">
              <Eye className="h-5 w-5" />
              {summary.buyerViews}
            </p>
            <p className="text-xs text-sp-navy-muted">Buyer opens</p>
          </div>
          <div className="rounded-xl border border-sp-blue/10 bg-sp-blue-soft/20 p-3 text-center">
            <p className="text-2xl font-bold text-sp-navy">{summary.accounts}</p>
            <p className="text-xs text-sp-navy-muted">Accounts</p>
          </div>
          <div className="rounded-xl border border-sp-blue/10 bg-sp-blue-soft/20 p-3 text-center">
            <p className="flex items-center justify-center gap-1 text-2xl font-bold text-sp-navy">
              <Share2 className="h-5 w-5" />
              {summary.shares}
            </p>
            <p className="text-xs text-sp-navy-muted">Shares</p>
          </div>
        </div>

        {topSe.length > 0 ? (
          <div>
            <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase text-sp-navy-muted">
              <Users className="h-3.5 w-3.5" />
              Most active SEs
            </p>
            <div className="flex flex-wrap gap-2">
              {topSe.map((row) => (
                <Badge key={row.seName} tone="blue">
                  {row.seName}: {row.count}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        <div className="max-h-48 space-y-2 overflow-y-auto">
          {rows.length === 0 ? (
            <p className="text-sm text-sp-navy-muted">No engagement yet — SEs create buyer rooms from Deal Prep.</p>
          ) : (
            rows.map((row, index) => (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sp-blue/10 px-3 py-2 text-xs" key={`${row.createdAt}-${index}`}>
                <span className="font-semibold text-sp-navy">{row.seName}</span>
                <span className="text-sp-navy-muted">{row.accountName}</span>
                <Badge tone={row.source === "buyer" ? "green" : "slate"}>
                  {row.source === "buyer" ? "buyer" : "se"} · {row.eventType.replace(/_/g, " ")}
                </Badge>
                <span className="text-sp-navy-muted">{row.resourceLabel}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
}
