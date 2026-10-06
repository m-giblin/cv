"use client";

import { useEffect, useState } from "react";
import { formatUsd } from "@/lib/ai/models";
import {
  BillingStatusTag,
  ROW_LINK,
  KpiStrip,
  Spinner,
  TABLE,
  TABLE_SCROLL,
  TABLE_WRAP,
  TD,
  TD_MUTED,
  TH,
  THEAD_ROW,
  TR,
} from "@/components/platform/platform-ui";
import { StatusPill } from "@/components/ui/status-pill";
import type { TenantUsageFleet } from "@/lib/tenant/types";

export function PlatformUsagePanel({
  onSelectTenant,
}: {
  onSelectTenant: (tenantId: string) => void;
}) {
  const [data, setData] = useState<TenantUsageFleet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/platform/usage")
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => setData(body as TenantUsageFleet | null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="Loading fleet usage" />;

  if (!data) {
    return <p className="text-[15px] text-muted">Could not load fleet usage.</p>;
  }

  return (
    <div className="space-y-7">
      <KpiStrip
        items={[
          { label: "Tenants", value: data.totals.tenantCount.toLocaleString() },
          { label: "Active users", value: data.totals.totalUsers.toLocaleString() },
          { label: "AI calls 30d", value: data.totals.aiCalls30d.toLocaleString() },
          { label: "AI tokens 30d", value: data.totals.aiTokens30d.toLocaleString() },
          { label: "Est. AI cost 30d", value: formatUsd(data.totals.aiCost30d) },
          { label: "Sim sessions 30d", value: data.totals.simulationSessions30d.toLocaleString() },
        ]}
      />

      <div className={TABLE_WRAP}>
        <div className={TABLE_SCROLL}>
          <table className={TABLE}>
            <thead>
              <tr className={THEAD_ROW}>
                <th className={TH} scope="col">Tenant</th>
                <th className={TH} scope="col">Billing</th>
                <th className={`${TH} text-right`} scope="col">Users</th>
                <th className={`${TH} text-right`} scope="col">Seat quota</th>
                <th className={`${TH} text-right`} scope="col">AI calls 30d</th>
                <th className={`${TH} text-right`} scope="col">AI tokens 30d</th>
                <th className={`${TH} text-right`} scope="col">Est. AI cost</th>
                <th className={`${TH} text-right`} scope="col">Sims 30d</th>
              </tr>
            </thead>
            <tbody>
              {data.tenants.map((row) => {
                const overQuota = row.seatQuota != null && row.activeUsers > row.seatQuota;
                return (
                  <tr className={TR} key={row.tenantId}>
                    <td className={TD}>
                      <button className={ROW_LINK} onClick={() => onSelectTenant(row.tenantId)} type="button">
                        {row.tenantName}
                      </button>
                      <p className="text-[13px] text-muted">{row.tenantSlug}</p>
                    </td>
                    <td className={TD}>
                      <BillingStatusTag status={row.billingStatus} />
                    </td>
                    <td className={`${TD_MUTED} text-right num`}>{row.activeUsers}</td>
                    <td className={`${TD_MUTED} text-right num`}>
                      {overQuota ? (
                        <StatusPill tone="danger">{row.seatQuota}, over quota</StatusPill>
                      ) : (
                        (row.seatQuota ?? "Unlimited")
                      )}
                    </td>
                    <td className={`${TD_MUTED} text-right num`}>{row.aiCalls30d.toLocaleString()}</td>
                    <td className={`${TD_MUTED} text-right num`}>{row.aiTokens30d.toLocaleString()}</td>
                    <td className={`${TD} text-right num font-semibold`}>{formatUsd(row.aiCost30d)}</td>
                    <td className={`${TD_MUTED} text-right num`}>{row.simulationSessions30d.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
