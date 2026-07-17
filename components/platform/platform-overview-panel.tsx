"use client";

import { AlertTriangle, Loader2, Ticket, Wrench } from "lucide-react";
import type { SupportRequest, TenantHealth } from "@/lib/tenant/types";

type OverviewData = {
  summary: {
    tenantCount: number;
    totalOpenTickets: number;
    tenantsNeedingAttention: number;
  };
  health: TenantHealth[];
  recentTickets: SupportRequest[];
};

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

function runbookForAlert(alert: string): { title: string; steps: string[] } {
  const lower = alert.toLowerCase();
  if (lower.includes("admin") && lower.includes("invite")) {
    return {
      title: "Missing / pending tenant admin",
      steps: [
        "Open the tenant → Provision",
        "Send or resend the admin invite",
        "If stuck, shadow as admin and verify email domain allowlist",
      ],
    };
  }
  if (lower.includes("user") || lower.includes("no users")) {
    return {
      title: "No users yet",
      steps: [
        "Confirm tenant admin has accepted invite",
        "Shadow as admin and walk through first SE invite",
        "Check allowed email domains under Branding",
      ],
    };
  }
  if (lower.includes("ticket") || lower.includes("sla") || lower.includes("support")) {
    return {
      title: "Support pressure",
      steps: [
        "Open Support queue filtered to this tenant",
        "Assign an operator and reply within SLA",
        "Add operator notes with context for the next shift",
      ],
    };
  }
  if (lower.includes("maintenance")) {
    return {
      title: "Maintenance mode on",
      steps: [
        "Confirm maintenance message is accurate",
        "End maintenance when upgrade completes",
        "Watch telemetry on Usage after reopening",
      ],
    };
  }
  return {
    title: "Needs attention",
    steps: [
      "Open the tenant record",
      "Review Health signals and recent audit events",
      "Shadow as admin if you need in-tenant diagnosis",
    ],
  };
}

export function PlatformOverviewPanel({
  data,
  healthWithActivity,
  loading,
  onSelectTenant,
  onOpenSupport,
}: {
  data: OverviewData | null;
  healthWithActivity?: TenantHealth[];
  loading: boolean;
  onSelectTenant: (tenantId: string) => void;
  onOpenSupport: () => void;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-[#0071ce]" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-[#6B6860]">Could not load platform overview.</p>;
  }

  const { summary, health, recentTickets } = data;
  const healthRows = healthWithActivity ?? health;
  const attentionTenants = health.filter((item) => item.alerts.length > 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-px bg-[#E2DFD9] sm:grid-cols-3">
        <div className="bg-white px-4 py-4">
          <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#A09D98]">
            Organizations
          </p>
          <p className="mt-1 font-display text-[28px] font-extrabold text-[#0D0E12]">
            {summary.tenantCount}
          </p>
        </div>
        <button
          className="bg-white px-4 py-4 text-left transition hover:bg-[#F0F7FF]"
          onClick={onOpenSupport}
          type="button"
        >
          <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#A09D98]">
            Open tickets
          </p>
          <p className="mt-1 font-display text-[28px] font-extrabold text-[#0D0E12]">
            {summary.totalOpenTickets}
          </p>
        </button>
        <div className="bg-white px-4 py-4">
          <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#A09D98]">
            Needs attention
          </p>
          <p className="mt-1 font-display text-[28px] font-extrabold text-[#B83128]">
            {summary.tenantsNeedingAttention}
          </p>
        </div>
      </div>

      {attentionTenants.length > 0 ? (
        <div className="border border-[#E2DFD9] bg-white">
          <div className="flex items-center gap-2 border-b border-[#E2DFD9] bg-[#FFF8F0] px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-[#D4810A]" />
            <h3 className="text-sm font-bold text-[#0D0E12]">Runbooks</h3>
            <span className="font-mono text-[10px] text-[#A09D98]">
              {attentionTenants.length} tenant{attentionTenants.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="divide-y divide-[#F0EFEB]">
            {attentionTenants.map((item) => {
              const runbook = runbookForAlert(item.alerts[0] ?? "");
              return (
                <div className="grid gap-4 px-4 py-3 lg:grid-cols-[1fr_1.2fr_auto]" key={item.tenantId}>
                  <div>
                    <p className="font-semibold text-[#0D0E12]">{item.name}</p>
                    <p className="mt-0.5 text-xs text-[#6B6860]">{item.alerts.join(" · ")}</p>
                  </div>
                  <div>
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-[#3D3C38]">
                      <Wrench className="h-3.5 w-3.5" />
                      {runbook.title}
                    </p>
                    <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-xs text-[#6B6860]">
                      {runbook.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>
                  <button
                    className="h-fit border border-[#0071CE]/30 bg-[#F0F7FF] px-3 py-1.5 text-xs font-semibold text-[#0071CE]"
                    onClick={() => onSelectTenant(item.tenantId)}
                    type="button"
                  >
                    Open tenant
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden border border-[#E2DFD9] bg-white">
        <div className="border-b border-[#E2DFD9] px-4 py-3">
          <h3 className="text-sm font-bold text-[#0D0E12]">Fleet health</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#E2DFD9] bg-[#F7F6F3] font-mono text-[8px] uppercase tracking-[0.1em] text-[#A09D98]">
                <th className="px-4 py-2">Tenant</th>
                <th className="px-4 py-2">Users</th>
                <th className="px-4 py-2">AI (30d)</th>
                <th className="px-4 py-2">Tickets</th>
                <th className="px-4 py-2">Last activity</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {healthRows.map((item) => (
                <tr
                  className="cursor-pointer border-b border-[#F0EFEB] hover:bg-[#F0F7FF]"
                  key={item.tenantId}
                  onClick={() => onSelectTenant(item.tenantId)}
                >
                  <td className="px-4 py-2 font-medium text-[#0D0E12]">{item.name}</td>
                  <td className="px-4 py-2 text-[#6B6860]">{item.userCount}</td>
                  <td className="px-4 py-2 text-[#6B6860]">{item.aiCalls30d}</td>
                  <td className="px-4 py-2 text-[#6B6860]">{item.openSupportTickets}</td>
                  <td className="px-4 py-2 text-[#6B6860]">
                    {formatRelative(item.lastUserActivityAt)}
                  </td>
                  <td className="px-4 py-2 font-mono text-[10px] uppercase text-[#6B6860]">
                    {item.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {recentTickets.length > 0 ? (
        <div className="border border-[#E2DFD9] bg-white">
          <div className="flex items-center justify-between border-b border-[#E2DFD9] px-4 py-3">
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-[#0071ce]" />
              <h3 className="text-sm font-bold text-[#0D0E12]">Recent support</h3>
            </div>
            <button
              className="text-xs font-semibold text-[#0071ce] hover:underline"
              onClick={onOpenSupport}
              type="button"
            >
              View all
            </button>
          </div>
          <div className="divide-y divide-[#F0EFEB]">
            {recentTickets.map((ticket) => (
              <div className="px-4 py-2.5 text-sm" key={ticket.id}>
                <p className="font-medium text-[#0D0E12]">{ticket.subject}</p>
                <p className="text-xs text-[#A09D98]">
                  {ticket.tenantName ?? "Unknown"} · {ticket.priority} · {ticket.status}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
