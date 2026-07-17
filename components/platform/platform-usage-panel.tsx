"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
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

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[#0071CE]" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-[#6B6860]">Could not load fleet usage.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-px bg-[#E2DFD9] sm:grid-cols-4">
        {[
          { label: "Tenants", value: data.totals.tenantCount },
          { label: "Active users", value: data.totals.totalUsers },
          { label: "AI calls (30d)", value: data.totals.aiCalls30d },
          { label: "Sim sessions (30d)", value: data.totals.simulationSessions30d },
        ].map((stat) => (
          <div className="bg-white px-4 py-4" key={stat.label}>
            <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#A09D98]">
              {stat.label}
            </p>
            <p className="mt-1 font-display text-[28px] font-extrabold tracking-[-0.03em] text-[#0D0E12]">
              {stat.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden border border-[#E2DFD9] bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#E2DFD9] bg-[#F7F6F3] font-mono text-[8px] uppercase tracking-[0.1em] text-[#A09D98]">
              <th className="px-4 py-2.5">Tenant</th>
              <th className="px-4 py-2.5">Billing</th>
              <th className="px-4 py-2.5">Users</th>
              <th className="px-4 py-2.5">Seat quota</th>
              <th className="px-4 py-2.5">AI (30d)</th>
              <th className="px-4 py-2.5">Sims (30d)</th>
            </tr>
          </thead>
          <tbody>
            {data.tenants.map((row) => {
              const overQuota =
                row.seatQuota != null && row.activeUsers > row.seatQuota;
              return (
                <tr
                  className="cursor-pointer border-b border-[#F0EFEB] hover:bg-[#F0F7FF]"
                  key={row.tenantId}
                  onClick={() => onSelectTenant(row.tenantId)}
                >
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-[#0D0E12]">{row.tenantName}</p>
                    <p className="font-mono text-[10px] text-[#A09D98]">{row.tenantSlug}</p>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[10px] uppercase text-[#6B6860]">
                    {row.billingStatus}
                  </td>
                  <td className="px-4 py-2.5 text-[#3D3C38]">{row.activeUsers}</td>
                  <td
                    className={`px-4 py-2.5 ${overQuota ? "font-semibold text-[#B83128]" : "text-[#3D3C38]"}`}
                  >
                    {row.seatQuota ?? "∞"}
                    {overQuota ? " · over" : ""}
                  </td>
                  <td className="px-4 py-2.5 text-[#3D3C38]">{row.aiCalls30d}</td>
                  <td className="px-4 py-2.5 text-[#3D3C38]">{row.simulationSessions30d}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
