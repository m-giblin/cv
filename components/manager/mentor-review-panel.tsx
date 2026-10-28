"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type MentorRequest = {
 id: string;
 userId: string;
 topic: string;
 seNotes: string | null;
 status: string;
 createdAt: string;
 seName?: string;
};

export function MentorReviewPanel() {
 const [requests, setRequests] = useState<MentorRequest[]>([]);
 const [feedback, setFeedback] = useState<Record<string, string>>({});
 const [isLoading, setIsLoading] = useState(true);

 const load = useCallback(async () => {
 setIsLoading(true);
 const response = await fetch("/api/mentor-reviews");
 if (response.ok) {
 const body = (await response.json()) as { requests: MentorRequest[] };
 setRequests(body.requests.filter((item) => item.status === "pending"));
 }
 setIsLoading(false);
 }, []);

 useEffect(() => {
 void load();
 }, [load]);

 async function complete(id: string, decision: "approve" | "reject") {
 const mentorFeedback = feedback[id]?.trim();
 if (!mentorFeedback || mentorFeedback.length < 3) {
 toast.error("Add feedback before completing.");
 return;
 }

 const response = await fetch("/api/mentor-reviews", {
 method: "PATCH",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ id, mentorFeedback, decision }),
 });

 if (!response.ok) {
 toast.error("Could not save mentor feedback.");
 return;
 }

 toast.success(decision === "approve" ? "Mentor review approved." : "Sent back for revision.");
 void load();
 }

 // Only check-in requests live here; submitted steps are counted in "Waiting on your review" and
 // listed on each mentee. An empty "no requests" box under a non-zero count read as a contradiction.
 if (isLoading || requests.length === 0) return null;

 return (
 <section className="space-y-3">
 <div>
 <h3 className="text-xl font-extrabold text-ink">Check-in requests <span className="num text-muted">{requests.length}</span></h3>
 <p className="mt-1 text-sm text-muted">Respond to mentee check-in requests from onboarding plans.</p>
 </div>
 <ul className="overflow-hidden rounded-[14px] border border-line bg-white">
 {requests.map((request) => (
 <li className="border-b border-divider px-5 py-4 last:border-b-0" key={request.id}>
 <p className="text-[15px] font-bold text-ink">{request.topic}</p>
 <p className="text-[13px] text-muted">{request.seName ?? "SE"}</p>
 {request.seNotes ? <p className="mt-2 max-w-[640px] text-[15px] text-ink-2">{request.seNotes}</p> : null}
 <label className="mt-3 block space-y-1.5 text-sm font-bold text-ink">
 <span className="block">Mentor feedback</span>
 <textarea
 className="w-full rounded-[10px] border border-line-strong bg-white px-3 py-2 text-[15px] font-normal text-ink"
 onChange={(e) => setFeedback((current) => ({ ...current, [request.id]: e.target.value }))}
 placeholder="Mentor feedback and next steps"
 rows={3}
 value={feedback[request.id] ?? ""}
 />
 </label>
 <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
 <button className="btn-secondary" onClick={() => void complete(request.id, "approve")} type="button">
 Approve step
 </button>
 <button className="link text-sm" onClick={() => void complete(request.id, "reject")} type="button">
 Needs revision
 </button>
 </div>
 </li>
 ))}
 </ul>
 </section>
 );
}
