"use client";

import { Loader2, MessageCircleQuestion, Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { SupportRequest, SupportPriority } from "@/lib/tenant/types";

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
 return (
 <div className="flex justify-center py-12">
 <Loader2 className="h-6 w-6 animate-spin text-[#0033a1]" />
 </div>
 );
 }

 return (
 <div className="max-w-3xl space-y-6">
 <div>
 <h2 className="font-display text-[20px] font-extrabold text-[#0D0E12]">Help & support</h2>
 <p className="mt-1 text-[12px] text-[#6B6860]">
 Contact the platform operator for entitlements, integrations, or access issues.
 </p>
 </div>

 <form className="border border-[#E2DFD9] bg-white p-[18px_22px] " onSubmit={(e) => void handleSubmit(e)}>
 <div className="mb-3 flex items-center gap-2">
 <MessageCircleQuestion className="h-4 w-4 text-[#0033a1]" />
 <h3 className="text-[14px] font-bold text-[#0D0E12]">New request</h3>
 </div>
 <div className="space-y-3">
 <label className="block text-sm">
 <span className="mb-1 block font-medium text-[#3D3C38]">Subject</span>
 <input
 className="w-full border border-[#E2DFD9] px-3 py-2"
 onChange={(e) => setSubject(e.target.value)}
 value={subject}
 />
 </label>
 <label className="block text-sm">
 <span className="mb-1 block font-medium text-[#3D3C38]">Priority</span>
 <select
 className="w-full border border-[#E2DFD9] px-3 py-2"
 onChange={(e) => setPriority(e.target.value as SupportPriority)}
 value={priority}
 >
 <option value="low">Low</option>
 <option value="medium">Medium</option>
 <option value="high">High</option>
 <option value="critical">Critical</option>
 </select>
 </label>
 <label className="block text-sm">
 <span className="mb-1 block font-medium text-[#3D3C38]">Message</span>
 <textarea
 className="min-h-[120px] w-full border border-[#E2DFD9] px-3 py-2"
 onChange={(e) => setBody(e.target.value)}
 placeholder="Describe what you need help with..."
 value={body}
 />
 </label>
 </div>
 <Button className="mt-4" disabled={submitting} type="submit">
 {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
 Submit request
 </Button>
 </form>

 <div className="border border-[#E2DFD9] bg-white p-[18px_22px] ">
 <h3 className="mb-3 text-[14px] font-bold text-[#0D0E12]">Your requests</h3>
 {tickets.length === 0 ? (
 <p className="text-[12px] text-[#6B6860]">No support requests yet.</p>
 ) : (
 <div className="space-y-2">
 {tickets.map((ticket) => (
 <div className="border border-[#ECEAE6] px-3 py-2" key={ticket.id}>
 <p className="text-[12px] font-semibold text-[#3D3C38]">{ticket.subject}</p>
 <p className="text-[10.5px] text-[#A09D98]">
 {ticket.status.replace("_", " ")} · {ticket.priority} · {new Date(ticket.createdAt).toLocaleDateString()}
 </p>
 {ticket.operatorReply ? (
 <p className="mt-2 rounded bg-[#f0f7ff] px-2 py-1 text-[11px] text-[#0D0E12]">{ticket.operatorReply}</p>
 ) : null}
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 );
}
