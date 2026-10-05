"use client";

import {
  EmptyLine,
  KpiStrip,
  LineCard,
  PriorityTag,
  Spinner,
  TABLE,
  TABLE_SCROLL,
  TD,
  TD_MONO,
  TD_MUTED,
  TH,
  THEAD_ROW,
  TR,
  TenantStatusTag,
} from "@/components/platform/platform-ui";
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
  if (loading) return <Spinner label="Loading tenant health" />;

  if (!data) {
    return <p className="text-[15px] text-muted">Could not load platform overview.</p>;
  }

  const { summary, health, recentTickets } = data;
  const healthRows = healthWithActivity ?? health;
  const attentionTenants = health.filter((item) => item.alerts.length > 0);

  return (
    <div className="space-y-7">
      <KpiStrip
        items={[
          { label: "Organizations", value: summary.tenantCount },
          { label: "Open tickets", value: summary.totalOpenTickets },
          {
            label: "Need attention",
            value: summary.tenantsNeedingAttention,
            tone: summary.tenantsNeedingAttention > 0 ? "danger" : "blue",
          },
        ]}
      />

      {attentionTenants.length > 0 ? (
        <LineCard meta={`${attentionTenants.length} tenant${attentionTenants.length === 1 ? "" : "s"}`} title="Runbooks">
          <ul>
            {attentionTenants.map((item) => {
              const runbook = runbookForAlert(item.alerts[0] ?? "");
              return (
                <li
                  className="grid gap-4 border-b border-divider px-5 py-4 last:border-b-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto]"
                  key={item.tenantId}
                >
                  <div>
                    <p className="text-[15px] font-bold text-ink">{item.name}</p>
                    <p className="mt-0.5 text-sm text-ink-2">
                      <span aria-hidden className="text-danger">▲ </span>
                      {item.alerts.join(" · ")}
                    </p>
                  </div>
                  <div>
                    <p className="label-mono">{runbook.title}</p>
                    <ol className="mt-1.5 space-y-1 text-sm text-ink-2">
                      {runbook.steps.map((step, index) => (
                        <li className="flex gap-2.5" key={step}>
                          <span className="font-mono text-xs leading-5 text-blue">{String(index + 1).padStart(2, "0")}</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <button
                    className="btn-secondary h-fit w-fit"
                    onClick={() => onSelectTenant(item.tenantId)}
                    type="button"
                  >
                    Open tenant
                  </button>
                </li>
              );
            })}
          </ul>
        </LineCard>
      ) : null}

      <LineCard meta={`${healthRows.length} tenants`} title="Fleet health">
        <div className={TABLE_SCROLL}>
          <table className={TABLE}>
            <thead>
              <tr className={THEAD_ROW}>
                <th className={TH} scope="col">Tenant</th>
                <th className={TH} scope="col">Users</th>
                <th className={TH} scope="col">AI calls 30d</th>
                <th className={TH} scope="col">Tickets</th>
                <th className={TH} scope="col">Last activity</th>
                <th className={TH} scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {healthRows.map((item) => (
                <tr className={TR} key={item.tenantId}>
                  <td className={TD}>
                    <button className="link text-left" onClick={() => onSelectTenant(item.tenantId)} type="button">
                      {item.name}
                    </button>
                  </td>
                  <td className={`${TD_MUTED} tabular-nums`}>{item.userCount}</td>
                  <td className={`${TD_MUTED} tabular-nums`}>{item.aiCalls30d}</td>
                  <td className={`${TD_MUTED} tabular-nums`}>{item.openSupportTickets}</td>
                  <td className={TD_MONO}>{formatRelative(item.lastUserActivityAt)}</td>
                  <td className={TD}>
                    <TenantStatusTag status={item.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LineCard>

      <LineCard
        action={
          <button className="link text-sm" onClick={onOpenSupport} type="button">
            View all
          </button>
        }
        title="Recent support"
      >
        {recentTickets.length === 0 ? (
          <EmptyLine>No recent tickets.</EmptyLine>
        ) : (
          <ul>
            {recentTickets.map((ticket) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 border-b border-divider px-5 py-3 last:border-b-0"
                key={ticket.id}
              >
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-ink">{ticket.subject}</p>
                  <p className="font-mono text-xs text-muted">
                    {ticket.tenantName ?? "Unknown"} · {ticket.status.replace("_", " ").toUpperCase()}
                  </p>
                </div>
                <PriorityTag priority={ticket.priority} />
              </li>
            ))}
          </ul>
        )}
      </LineCard>
    </div>
  );
}
