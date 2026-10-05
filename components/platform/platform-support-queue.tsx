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
  TD_MONO,
  TD_MUTED,
  TH,
  THEAD_ROW,
  TR,
  formatDateTime,
} from "@/components/platform/platform-ui";
import { Chip } from "@/components/ui/chip";
import { Drawer } from "@/components/ui/drawer";
import { Tag } from "@/components/ui/tag";
import { Textarea } from "@/components/ui/textarea";
import { supportSlaStatus } from "@/lib/platform/support-sla";
import type { SupportRequest, SupportStatus } from "@/lib/tenant/types";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: SupportStatus[] = ["open", "in_progress", "resolved", "closed"];
const FILTERS = ["active", "open", "in_progress", "resolved", "closed", "all"] as const;

function statusLabel(value: string) {
  return value.replace("_", " ");
}

function StatusTag({ status }: { status: SupportStatus }) {
  if (status === "resolved" || status === "closed") return <Tag tone="success">✓ {statusLabel(status)}</Tag>;
  if (status === "in_progress") return <Tag tone="blue">● {statusLabel(status)}</Tag>;
  return <Tag>• {statusLabel(status)}</Tag>;
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
      <div aria-label="Filter tickets by status" className="flex flex-wrap gap-1.5" role="group">
        {FILTERS.map((value) => (
          <Chip active={filter === value} key={value} onClick={() => setFilter(value)}>
            {value === "active" ? "Open + in progress" : statusLabel(value)}
          </Chip>
        ))}
      </div>

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
                      <tr className={cn(TR, sla.breached && "bg-danger-soft")} key={item.id}>
                        <td className={TD}>
                          <p className="font-semibold">{item.subject}</p>
                          <p className="font-mono text-xs text-muted">
                            {item.reporterName ?? item.reporterEmail ?? "Reporter"} · {formatDateTime(item.createdAt)}
                          </p>
                        </td>
                        {tenantId ? null : <td className={TD_MUTED}>{item.tenantName ?? "Unknown tenant"}</td>}
                        <td className={TD}>
                          <PriorityTag priority={item.priority} />
                        </td>
                        <td className={TD}>
                          {sla.breached ? (
                            <Tag tone="danger">▲ {sla.label}</Tag>
                          ) : (
                            <span className="font-mono text-xs text-ink-2">{sla.label}</span>
                          )}
                        </td>
                        <td className={TD}>
                          <StatusTag status={item.status} />
                        </td>
                        <td className={TD_MONO}>{operatorName(item.assignedTo)}</td>
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
            <p className="font-mono text-xs text-muted">
              {ticket.tenantName ?? "Unknown tenant"} · {ticket.reporterName ?? ticket.reporterEmail ?? "Reporter"} ·{" "}
              {formatDateTime(ticket.createdAt)}
            </p>
            <p className="text-[15px] leading-normal whitespace-pre-wrap text-ink">{ticket.body}</p>

            {ticket.operatorReply ? (
              <div className="rounded-[10px] bg-blue-soft px-4 py-3">
                <p className="label-mono text-blue">Reply sent to tenant</p>
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
