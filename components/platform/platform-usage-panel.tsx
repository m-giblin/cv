"use client";

import { useEffect, useState } from "react";
import {
  BillingStatusTag,
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
import { Tag } from "@/components/ui/tag";
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
                <th className={`${TH} text-right`} scope="col">Sims 30d</th>
              </tr>
            </thead>
            <tbody>
              {data.tenants.map((row) => {
                const overQuota = row.seatQuota != null && row.activeUsers > row.seatQuota;
                return (
                  <tr className={TR} key={row.tenantId}>
                    <td className={TD}>
                      <button className="link text-left" onClick={() => onSelectTenant(row.tenantId)} type="button">
                        {row.tenantName}
                      </button>
                      <p className="font-mono text-xs text-muted">{row.tenantSlug}</p>
                    </td>
                    <td className={TD}>
                      <BillingStatusTag status={row.billingStatus} />
                    </td>
                    <td className={`${TD_MUTED} text-right tabular-nums`}>{row.activeUsers}</td>
                    <td className={`${TD_MUTED} text-right tabular-nums`}>
                      {overQuota ? (
                        <Tag tone="danger">▲ {row.seatQuota} · over</Tag>
                      ) : (
                        (row.seatQuota ?? "Unlimited")
                      )}
                    </td>
                    <td className={`${TD_MUTED} text-right tabular-nums`}>{row.aiCalls30d.toLocaleString()}</td>
                    <td className={`${TD_MUTED} text-right tabular-nums`}>{row.aiTokens30d.toLocaleString()}</td>
                    <td className={`${TD_MUTED} text-right tabular-nums`}>{row.simulationSessions30d.toLocaleString()}</td>
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
