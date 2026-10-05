"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
 EmptyState,
 Field,
 LineCard,
 LoadingState,
 Mono,
 SelectInput,
 TextArea,
 TextInput,
} from "@/components/admin/admin-ui";
import { Tag } from "@/components/ui/tag";
import type { SupportRequest, SupportPriority, SupportStatus } from "@/lib/tenant/types";

const STATUS_TAG: Record<SupportStatus, { tone: "blue" | "warning" | "success" | "neutral"; symbol: string }> = {
 open: { tone: "blue", symbol: "●" },
 in_progress: { tone: "warning", symbol: "◆" },
 resolved: { tone: "success", symbol: "✓" },
 closed: { tone: "neutral", symbol: "•" },
};

export function AdminHelpPanel() {
 const [tickets, setTickets] = useState<SupportRequest[]>([]);
 const [loading, setLoading] = useState(true);
 const [submitting, setSubmitting] = useState(false);
 const [subject, setSubject] = useState("");
 const [body, setBody] = useState("");
 const [priority, setPriority] = useState<SupportPriority>("medium");

 const load = useCallback(async () => {
 setLoading(true);
 const response = await fetch("/api/admin/support");
 setLoading(false);
 if (!response.ok) {
 toast.error("Could not load support requests.");
 return;
 }
 const data = (await response.json()) as { tickets: SupportRequest[] };
 setTickets(data.tickets ?? []);
 }, []);

 useEffect(() => {
 void load();
 }, [load]);

 async function handleSubmit(event: React.FormEvent) {
 event.preventDefault();
 if (!subject.trim() || body.trim().length < 10) {
 toast.error("Subject and a detailed message (10+ chars) are required.");
 return;
 }
 setSubmitting(true);
 const response = await fetch("/api/admin/support", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 subject: subject.trim(),
 body: body.trim(),
 priority,
 pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
 }),
 });
 setSubmitting(false);
 if (!response.ok) {
 const data = (await response.json().catch(() => null)) as { error?: string } | null;
 toast.error(data?.error ?? "Could not submit request.");
 return;
 }
 toast.success("Support request submitted. The platform team will follow up.");
 setSubject("");
 setBody("");
 setPriority("medium");
 void load();
 }

 if (loading) {
 return <LoadingState label="Loading support requests…" />;
 }

 return (
 <div className="flex max-w-3xl flex-col gap-6">
 <LineCard title="New request">
 <p className="mb-4 text-sm text-muted">
 Contact the platform operator for entitlements, integrations, or access issues.
 </p>
 <form className="flex flex-col gap-4" onSubmit={(e) => void handleSubmit(e)}>
 <Field htmlFor="support-subject" label="Subject">
 <TextInput id="support-subject" onChange={(e) => setSubject(e.target.value)} value={subject} />
 </Field>
 <Field htmlFor="support-priority" label="Priority">
 <SelectInput
 id="support-priority"
 onChange={(e) => setPriority(e.target.value as SupportPriority)}
 value={priority}
 >
 <option value="low">Low</option>
 <option value="medium">Medium</option>
 <option value="high">High</option>
 <option value="critical">Critical</option>
 </SelectInput>
 </Field>
 <Field htmlFor="support-message" label="Message">
 <TextArea
 className="min-h-[120px]"
 id="support-message"
 onChange={(e) => setBody(e.target.value)}
 placeholder="Describe what you need help with…"
 value={body}
 />
 </Field>
 <div>
 <button className="btn-primary" disabled={submitting} type="submit">
 {submitting ? "Submitting…" : "Submit request"}
 </button>
 </div>
 </form>
 </LineCard>

 <LineCard bodyClassName="p-0" meta={tickets.length > 0 ? `${tickets.length}` : undefined} title="Your requests">
 {tickets.length === 0 ? (
 <EmptyState>No support requests yet.</EmptyState>
 ) : (
 <ul>
 {tickets.map((ticket) => {
 const status = STATUS_TAG[ticket.status] ?? STATUS_TAG.open;
 return (
 <li className="border-b border-divider px-5 py-3.5 last:border-b-0" key={ticket.id}>
 <div className="flex flex-wrap items-center justify-between gap-3">
 <p className="text-[15px] font-bold text-ink">{ticket.subject}</p>
 <Tag tone={status.tone}>
 {status.symbol} {ticket.status.replace("_", " ")}
 </Tag>
 </div>
 <Mono className="mt-1 block text-muted">
 {ticket.priority} priority · {new Date(ticket.createdAt).toLocaleDateString()}
 </Mono>
 {ticket.operatorReply ? (
 <p className="mt-2.5 rounded-[10px] bg-blue-soft px-3 py-2 text-sm text-ink">{ticket.operatorReply}</p>
 ) : null}
 </li>
 );
 })}
 </ul>
 )}
 </LineCard>
 </div>
 );
}
