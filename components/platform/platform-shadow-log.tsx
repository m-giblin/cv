"use client";

import {
  EmptyLine,
  ROW_LINK,
  TABLE,
  TABLE_SCROLL,
  TABLE_WRAP,
  TD,
  TD_META,
  TD_MUTED,
  TH,
  THEAD_ROW,
  TR,
  formatDateTime,
} from "@/components/platform/platform-ui";
import { StatusPill } from "@/components/ui/status-pill";
import type { ShadowSession } from "@/lib/platform/mission-control-types";

const MODE_LABEL: Record<string, string> = { admin: "Tenant admin", manager: "Manager", se: "Sales engineer" };

export function PlatformShadowLog({
  sessions,
  onSelectTenant,
}: {
  sessions: ShadowSession[];
  onSelectTenant?: (tenantId: string) => void;
}) {
  if (sessions.length === 0) {
    return (
      <div className={TABLE_WRAP}>
        <EmptyLine>No shadow sessions in the selected window.</EmptyLine>
      </div>
    );
  }

  return (
    <div className={TABLE_WRAP}>
      <div className={TABLE_SCROLL}>
        <table className={TABLE}>
          <thead>
            <tr className={THEAD_ROW}>
              <th className={TH} scope="col">Operator</th>
              <th className={TH} scope="col">Tenant</th>
              <th className={TH} scope="col">Mode</th>
              <th className={TH} scope="col">Started</th>
              <th className={TH} scope="col">Duration</th>
              <th className={TH} scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr className={TR} key={`${session.id}-${session.startedAt}`}>
                <td className={`${TD} font-bold`}>{session.actorName ?? session.actorId.slice(0, 8)}</td>
                <td className={TD_MUTED}>
                  {session.tenantId && onSelectTenant ? (
                    <button className={ROW_LINK} onClick={() => onSelectTenant(session.tenantId!)} type="button">
                      {session.tenantName ?? session.tenantId.slice(0, 8)}
                    </button>
                  ) : (
                    (session.tenantName ?? "—")
                  )}
                </td>
                <td className={TD_META}>{session.mode ? (MODE_LABEL[session.mode] ?? session.mode) : "—"}</td>
                <td className={TD_META}>{formatDateTime(session.startedAt)}</td>
                <td className={TD_META}>{session.durationMinutes != null ? `${session.durationMinutes} min` : "—"}</td>
                <td className={TD}>
                  {session.active ? <StatusPill tone="warning">Active</StatusPill> : <StatusPill tone="neutral">Ended</StatusPill>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
