"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { toast } from "sonner";
import {
  EmptyLine,
  FIELD_LABEL,
  PriorityTag,
  SELECT,
  Spinner,
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
  humanize,
} from "@/components/platform/platform-ui";
import { Chip } from "@/components/ui/chip";
import { Drawer } from "@/components/ui/drawer";
import { StatusPill } from "@/components/ui/status-pill";
import { FilterBar, TwoLineCell, rowHighlight } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { supportSlaStatus } from "@/lib/platform/support-sla";
import type { SupportRequest, SupportStatus } from "@/lib/tenant/types";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: SupportStatus[] = ["open", "in_progress", "resolved", "closed"];
const FILTERS = ["active", "open", "in_progress", "resolved", "closed", "all"] as const;

function statusLabel(value: string) {
  return humanize(value);
}

function StatusTag({ status }: { status: SupportStatus }) {
  const tone = status === "resolved" || status === "closed" ? "success" : status === "in_progress" ? "blue" : "neutral";
  return <StatusPill tone={tone}>{statusLabel(status)}</StatusPill>;
}

export function PlatformSupportQueue({
  tenantId,
  operators = [],
  onSelectTenant,
  onShadowTenant,
}: {
  tenantId?: string | null;
  operators?: Array<{ id: string; fullName: string; email: string }>;
  onSelectTenant?: (tenantId: string) => void;
  onShadowTenant?: (tenantId: string) => void;
}) {
  const statusId = useId();
  const assignId = useId();
  const replyId = useId();
  const notesId = useId();
  const [tickets, setTickets] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SupportStatus | "active" | "all">("active");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (tenantId) params.set("tenantId", tenantId);
    if (filter !== "all") params.set("status", filter);
    const response = await fetch(`/api/platform/support?${params.toString()}`);
    setLoading(false);
    if (!response.ok) {
      toast.error("Could not load support tickets.");
      return;
    }
    const body = (await response.json()) as { tickets: SupportRequest[] };
    setTickets(body.tickets ?? []);
  }, [filter, tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const closeDrawer = useCallback(() => setOpenId(null), []);

  async function updateTicket(
    id: string,
    patch: {
      status?: SupportStatus;
      operatorNotes?: string | null;
      operatorReply?: string | null;
      assignedTo?: string | null;
    },
  ) {
    setSavingId(id);
    const response = await fetch(`/api/platform/support/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setSavingId(null);
    if (!response.ok) {
      toast.error("Could not update ticket.");
      return;
    }
    toast.success("Ticket updated.");
    void load();
  }

  const ticket = tickets.find((item) => item.id === openId) ?? null;
  const operatorName = (id: string | null | undefined) =>
    id ? (operators.find((op) => op.id === id)?.fullName ?? "Assigned") : "Unassigned";

  return (
    <div className="space-y-4">
      <FilterBar
        show={
          <div aria-label="Filter tickets by status" className="flex flex-wrap gap-1.5" role="group">
            {FILTERS.map((value) => (
              <Chip active={filter === value} key={value} onClick={() => setFilter(value)}>
                {value === "active" ? "Open and in progress" : statusLabel(value)}
              </Chip>
            ))}
          </div>
        }
      />

      {loading ? (
        <Spinner label="Loading tickets" />
      ) : (
        <div className={TABLE_WRAP}>
          {tickets.length === 0 ? (
            <EmptyLine>No support tickets match this filter.</EmptyLine>
          ) : (
            <div className={TABLE_SCROLL}>
              <table className={TABLE}>
                <thead>
                  <tr className={THEAD_ROW}>
                    <th className={TH} scope="col">Ticket</th>
                    {tenantId ? null : <th className={TH} scope="col">Tenant</th>}
                    <th className={TH} scope="col">Priority</th>
                    <th className={TH} scope="col">SLA</th>
                    <th className={TH} scope="col">Status</th>
                    <th className={TH} scope="col">Owner</th>
                    <th className={`${TH} text-right`} scope="col">
                      <span className="sr-only">Action</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((item) => {
                    const sla = supportSlaStatus(item.createdAt, item.priority, item.status, item.firstResponseAt);
                    return (
                      <tr className={cn(TR, sla.breached && rowHighlight.danger)} key={item.id}>
                        <td className={TD}>
                          <TwoLineCell
                            subline={`${item.reporterName ?? item.reporterEmail ?? "Reporter"}, ${formatDateTime(item.createdAt)}`}
                            title={item.subject}
                          />
                        </td>
                        {tenantId ? null : <td className={TD_MUTED}>{item.tenantName ?? "Unknown tenant"}</td>}
                        <td className={TD}>
                          <PriorityTag priority={item.priority} />
                        </td>
                        <td className={TD}>
                          {sla.breached ? (
                            <StatusPill tone="danger">{sla.label}</StatusPill>
                          ) : (
                            <span className="num text-[13px] text-ink-2">{sla.label}</span>
                          )}
                        </td>
                        <td className={TD}>
                          <StatusTag status={item.status} />
                        </td>
                        <td className={TD_META}>{operatorName(item.assignedTo)}</td>
                        <td className={`${TD} text-right`}>
                          <button className="link" onClick={() => setOpenId(item.id)} type="button">
                            Review<span className="sr-only"> {item.subject}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Drawer
        footer={
          ticket ? (
            <>
              {onSelectTenant ? (
                <button className="btn-secondary" onClick={() => onSelectTenant(ticket.tenantId)} type="button">
                  Open tenant
                </button>
              ) : null}
              {onShadowTenant ? (
                <button className="btn-secondary" onClick={() => onShadowTenant(ticket.tenantId)} type="button">
                  Shadow tenant
                </button>
              ) : null}
            </>
          ) : undefined
        }
        onClose={closeDrawer}
        open={ticket != null}
        title={ticket?.subject ?? "Ticket"}
      >
        {ticket ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <PriorityTag priority={ticket.priority} />
              <StatusTag status={ticket.status} />
            </div>
            <p className="text-[13px] text-muted">
              From {ticket.reporterName ?? ticket.reporterEmail ?? "the reporter"} at {ticket.tenantName ?? "an unknown tenant"},{" "}
              {formatDateTime(ticket.createdAt)}
            </p>
            <p className="text-[15px] leading-normal whitespace-pre-wrap text-ink">{ticket.body}</p>

            {ticket.operatorReply ? (
              <div className="rounded-[10px] bg-blue-soft px-4 py-3">
                <p className="label-caps label-caps--blue">Reply sent to tenant</p>
                <p className="mt-1 text-[15px] text-ink">{ticket.operatorReply}</p>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={FIELD_LABEL} htmlFor={statusId}>
                  Status
                </label>
                <select
                  className={SELECT}
                  disabled={savingId === ticket.id}
                  id={statusId}
                  onChange={(event) => void updateTicket(ticket.id, { status: event.target.value as SupportStatus })}
                  value={ticket.status}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {statusLabel(status)}
                    </option>
                  ))}
                </select>
              </div>
              {operators.length > 0 ? (
                <div>
                  <label className={FIELD_LABEL} htmlFor={assignId}>
                    Owner
                  </label>
                  <select
                    className={SELECT}
                    disabled={savingId === ticket.id}
                    id={assignId}
                    onChange={(event) => void updateTicket(ticket.id, { assignedTo: event.target.value || null })}
                    value={ticket.assignedTo ?? ""}
                  >
                    <option value="">Unassigned</option>
                    {operators.map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>

            <div>
              <label className={FIELD_LABEL} htmlFor={replyId}>
                Reply to tenant <span className="font-normal text-muted">(visible in Help)</span>
              </label>
              <Textarea
                className="min-h-[96px]"
                id={replyId}
                onChange={(event) => setReplyDrafts((current) => ({ ...current, [ticket.id]: event.target.value }))}
                placeholder="Status update the tenant admin will see"
                value={replyDrafts[ticket.id] ?? ticket.operatorReply ?? ""}
              />
              <button
                className="btn-secondary mt-2"
                disabled={savingId === ticket.id}
                onClick={() => {
                  const reply = (replyDrafts[ticket.id] ?? ticket.operatorReply ?? "").trim();
                  void updateTicket(ticket.id, { operatorReply: reply || null });
                }}
                type="button"
              >
                Send reply
              </button>
            </div>

            <div>
              <label className={FIELD_LABEL} htmlFor={notesId}>
                Internal operator notes
              </label>
              <Textarea
                className="min-h-[96px]"
                defaultValue={ticket.operatorNotes ?? ""}
                id={notesId}
                key={ticket.id}
                onBlur={(event) => {
                  const next = event.target.value.trim() || null;
                  if (next !== (ticket.operatorNotes ?? null)) {
                    void updateTicket(ticket.id, { operatorNotes: next });
                  }
                }}
              />
              <p className="mt-1 text-[13px] text-muted">Saved when you leave the field.</p>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
