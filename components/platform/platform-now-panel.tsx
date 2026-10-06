"use client";

import type { ReactNode } from "react";
import { StatusPill } from "@/components/ui/status-pill";
import { rowHighlight } from "@/components/ui/table";
import {
  EmptyLine,
  KpiStrip,
  LineCard,
  PriorityTag,
  ROW_LINK,
  Spinner,
  TABLE,
  TABLE_SCROLL,
  TD,
  TD_MUTED,
  TH,
  THEAD_ROW,
  TR,
} from "@/components/platform/platform-ui";
import type { MissionControlNow } from "@/lib/platform/mission-control-types";

export function PlatformNowPanel({
  data,
  loading,
  onOpenSupport,
  onSelectTenant,
  onOpenShadow,
  rail,
}: {
  data: MissionControlNow | null;
  loading: boolean;
  onOpenSupport: () => void;
  onSelectTenant: (tenantId: string) => void;
  onOpenShadow: () => void;
  /** Extra rail content (operator activity). */
  rail?: ReactNode;
}) {
  if (loading) return <Spinner label="Loading mission control" />;

  if (!data) {
    return <p className="text-[15px] text-muted">Could not load mission control.</p>;
  }

  const { summary, criticalTickets, recentAlerts, maintenanceTenants } = data;

  return (
    <div className="space-y-7">
      <KpiStrip
        items={[
          { label: "Open tickets", value: summary.openTickets },
          {
            label: "SLA breached",
            value: summary.slaBreached,
            tone: summary.slaBreached > 0 ? "danger" : "blue",
            note: summary.slaBreached > 0 ? "Reply now" : undefined,
          },
          { label: "Tenants with alerts", value: summary.tenantsNeedingAttention },
          { label: "Active shadows", value: summary.activeShadowSessions },
        ]}
      />

      <div className="flex flex-wrap gap-[var(--rail-gap)] min-[1100px]:grid min-[1100px]:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 flex-1 space-y-7">
          <LineCard
            action={
              <button className="link text-sm" onClick={onOpenSupport} type="button">
                Open support queue
              </button>
            }
            meta={`${criticalTickets.length} critical or breached`}
            title="Needs attention now"
          >
            {criticalTickets.length === 0 ? (
              <EmptyLine>No critical or SLA-breached tickets.</EmptyLine>
            ) : (
              <div className={TABLE_SCROLL}>
                <table className={TABLE}>
                  <thead>
                    <tr className={THEAD_ROW}>
                      <th className={TH} scope="col">Ticket</th>
                      <th className={TH} scope="col">Tenant</th>
                      <th className={TH} scope="col">Priority</th>
                      <th className={TH} scope="col">SLA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {criticalTickets.map((ticket) => (
                      <tr className={ticket.slaBreached ? `${TR} ${rowHighlight.danger}` : TR} key={ticket.id}>
                        <td className={`${TD} font-bold`}>{ticket.subject}</td>
                        <td className={TD_MUTED}>
                          {ticket.tenantId ? (
                            <button className="link" onClick={() => onSelectTenant(ticket.tenantId)} type="button">
                              {ticket.tenantName ?? "Tenant"}
                            </button>
                          ) : (
                            (ticket.tenantName ?? "—")
                          )}
                        </td>
                        <td className={TD}>
                          <PriorityTag priority={ticket.priority} />
                        </td>
                        <td className={TD}>
                          {ticket.slaBreached ? (
                            <StatusPill tone="danger">{ticket.slaLabel}</StatusPill>
                          ) : (
                            <span className="num text-[13px] text-ink-2">{ticket.slaLabel}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </LineCard>

          <LineCard meta={`${recentAlerts.length} tenants`} title="Tenant alerts">
            {recentAlerts.length === 0 ? (
              <EmptyLine>No tenant alerts.</EmptyLine>
            ) : (
              <ul>
                {recentAlerts.map((item) => (
                  <li
                    className="grid gap-1 border-b border-divider px-5 py-3 last:border-b-0 sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-4"
                    key={item.tenantId}
                  >
                    <button
                      className={`${ROW_LINK} w-fit`}
                      onClick={() => onSelectTenant(item.tenantId)}
                      type="button"
                    >
                      {item.name}
                    </button>
                    <span className="text-sm font-semibold text-warning">{item.alerts.join(". ")}</span>
                  </li>
                ))}
              </ul>
            )}
          </LineCard>
        </div>

        <aside className="w-full min-w-0 space-y-7 min-[1100px]:w-auto">
          <LineCard
            action={
              <button className="link text-sm" onClick={onOpenShadow} type="button">
                Shadow log
              </button>
            }
            title="Maintenance"
          >
            {maintenanceTenants.length === 0 ? (
              <EmptyLine>No tenants in maintenance mode.</EmptyLine>
            ) : (
              <ul>
                {maintenanceTenants.map((t) => (
                  <li className="border-b border-divider px-5 py-3 last:border-b-0" key={t.tenantId}>
                    <button className={ROW_LINK} onClick={() => onSelectTenant(t.tenantId)} type="button">
                      {t.name}
                    </button>
                    {t.message ? <p className="mt-0.5 text-sm text-ink-2">{t.message}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </LineCard>
          {rail}
        </aside>
      </div>
    </div>
  );
}
