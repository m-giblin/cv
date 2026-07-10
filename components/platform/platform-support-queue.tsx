"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supportSlaStatus } from "@/lib/platform/support-sla";
import type { SupportRequest, SupportStatus } from "@/lib/tenant/types";

const STATUS_OPTIONS: SupportStatus[] = ["open", "in_progress", "resolved", "closed"];

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
 const [tickets, setTickets] = useState<SupportRequest[]>([]);
 const [loading, setLoading] = useState(true);
 const [filter, setFilter] = useState<SupportStatus | "active" | "all">("active");
 const [savingId, setSavingId] = useState<string | null>(null);
 const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

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

 if (loading) {
 return (
 <div className="flex justify-center py-16">
 <Loader2 className="h-7 w-7 animate-spin text-[#0071ce]" />
 </div>
 );
 }

 return (
 <div className="space-y-4">
 <div className="flex flex-wrap gap-2">
 {(["active", "open", "in_progress", "resolved", "closed", "all"] as const).map((value) => (
 <button
 className={`px-3 py-1.5 text-sm font-medium transition ${
 filter === value ? "bg-[#0071ce] text-white" : "border border-[#E2DFD9] bg-white text-[#3D3C38]"
 }`}
 key={value}
 onClick={() => setFilter(value)}
 type="button"
 >
 {value === "active" ? "Open + in progress" : value.replace("_", " ")}
 </button>
 ))}
 </div>

 {tickets.length === 0 ? (
 <p className="text-sm text-[#6B6860]">No support tickets match this filter.</p>
 ) : (
 <div className="space-y-3">
 {tickets.map((ticket) => {
 const sla = supportSlaStatus(ticket.createdAt, ticket.priority, ticket.status, ticket.firstResponseAt);
 return (
 <div
 className={`border bg-white p-4 ${
 sla.breached ? "border-red-200" : "border-[#E2DFD9]"
 }`}
 key={ticket.id}
 >
 <div className="flex flex-wrap items-start justify-between gap-2">
 <div>
 <p className="font-semibold text-[#0D0E12]">{ticket.subject}</p>
 <p className="mt-1 text-xs text-[#A09D98]">
 {ticket.tenantName ?? "Unknown tenant"} · {ticket.reporterName ?? ticket.reporterEmail ?? "Reporter"} ·{" "}
 {new Date(ticket.createdAt).toLocaleString()}
 </p>
 </div>
 <div className="flex flex-col items-end gap-1">
 <span className="rounded-full bg-[#ECEAE6] px-2 py-0.5 text-xs font-semibold uppercase text-[#6B6860]">
 {ticket.priority}
 </span>
 <span className={`text-xs font-medium ${sla.breached ? "text-red-600" : "text-[#6B6860]"}`}>
 {sla.label}
 </span>
 </div>
 </div>
 <p className="mt-3 whitespace-pre-wrap text-sm text-[#3D3C38]">{ticket.body}</p>
 {ticket.operatorReply ? (
 <div className="mt-3 bg-[#f0f7ff] px-3 py-2 text-sm text-[#0D0E12]">
 <p className="text-xs font-bold uppercase text-[#0071ce]">Reply to tenant</p>
 <p className="mt-1">{ticket.operatorReply}</p>
 </div>
 ) : null}
 <div className="mt-4 flex flex-wrap items-center gap-2">
 <select
 className="border border-[#E2DFD9] px-2 py-1.5 text-sm"
 disabled={savingId === ticket.id}
 onChange={(event) => void updateTicket(ticket.id, { status: event.target.value as SupportStatus })}
 value={ticket.status}
 >
 {STATUS_OPTIONS.map((status) => (
 <option key={status} value={status}>
 {status.replace("_", " ")}
 </option>
 ))}
 </select>
 {operators.length > 0 ? (
 <select
 className="border border-[#E2DFD9] px-2 py-1.5 text-sm"
 disabled={savingId === ticket.id}
 onChange={(event) =>
 void updateTicket(ticket.id, {
 assignedTo: event.target.value || null,
 })
 }
 value={ticket.assignedTo ?? ""}
 >
 <option value="">Unassigned</option>
 {operators.map((op) => (
 <option key={op.id} value={op.id}>
 {op.fullName}
 </option>
 ))}
 </select>
 ) : null}
 {onSelectTenant ? (
 <Button onClick={() => onSelectTenant(ticket.tenantId)} type="button" variant="outline">
 Open tenant
 </Button>
 ) : null}
 {onShadowTenant ? (
 <Button onClick={() => onShadowTenant(ticket.tenantId)} type="button" variant="outline">
 Shadow tenant
 </Button>
 ) : null}
 </div>
 <label className="mt-3 block text-sm">
 <span className="mb-1 block font-medium text-[#3D3C38]">Reply to tenant (visible in Help)</span>
 <textarea
 className="min-h-[60px] w-full border border-[#E2DFD9] px-3 py-2 text-sm"
 onChange={(event) =>
 setReplyDrafts((current) => ({ ...current, [ticket.id]: event.target.value }))
 }
 placeholder="Status update the tenant admin will see…"
 value={replyDrafts[ticket.id] ?? ticket.operatorReply ?? ""}
 />
 <Button
 className="mt-2"
 disabled={savingId === ticket.id}
 onClick={() => {
 const reply = (replyDrafts[ticket.id] ?? ticket.operatorReply ?? "").trim();
 void updateTicket(ticket.id, { operatorReply: reply || null });
 }}
 type="button"
 variant="outline"
 >
 Send reply
 </Button>
 </label>
 <label className="mt-3 block text-sm">
 <span className="mb-1 block font-medium text-[#3D3C38]">Internal operator notes</span>
 <textarea
 className="min-h-[60px] w-full border border-[#E2DFD9] px-3 py-2 text-sm"
 defaultValue={ticket.operatorNotes ?? ""}
 onBlur={(event) => {
 const next = event.target.value.trim() || null;
 if (next !== (ticket.operatorNotes ?? null)) {
 void updateTicket(ticket.id, { operatorNotes: next });
 }
 }}
 />
 </label>
 </div>
 );
 })}
 </div>
 )}
 </div>
 );
}
