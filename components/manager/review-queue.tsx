"use client";

import { CheckCircle2, ChevronDown, ChevronUp, Loader2, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type SubmissionReviewItem = {
 kind: "submission";
 id: string;
 title: string;
 personName: string;
 reflectionText?: string | null;
};

type CoachingReviewItem = {
 kind: "coaching";
 id: string;
 title: string;
 personName: string;
 score: number;
 strengths: string[];
 gaps: string[];
 recommendedImprovements: string[];
 managerSummary: string;
 seReflection?: string | null;
 transcript?: string;
 simulationLabel?: string;
};

export type ReviewItem = SubmissionReviewItem | CoachingReviewItem;

export function ManagerReviewQueue({ items }: { items: ReviewItem[] }) {
 const [activeId, setActiveId] = useState<string | null>(null);
 const [feedback, setFeedback] = useState("");
 const [grade, setGrade] = useState("4");
 const [isSaving, setIsSaving] = useState(false);
 const [expandedTranscript, setExpandedTranscript] = useState<string | null>(null);

 async function submitReview(item: ReviewItem, decision: "approve" | "reject") {
 setIsSaving(true);

 const endpoint =
 item.kind === "submission"
 ? `/api/reviews/submissions/${item.id}`
 : `/api/reviews/coaching-cards/${item.id}`;

 const body =
 item.kind === "submission"
 ? { managerFeedback: feedback, managerGrade: Number(grade), decision }
 : { managerComments: feedback, managerGrade: Number(grade), decision };

 const response = await fetch(endpoint, {
 method: "PATCH",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify(body),
 });

 if (!response.ok) {
 toast.error("Review failed.");
 setIsSaving(false);
 return;
 }

 toast.success(decision === "approve" ? "Approved and feedback sent." : "Sent back for revision.");
 setActiveId(null);
 setFeedback("");
 setIsSaving(false);
 window.location.reload();
 }

 if (items.length === 0) {
 return null;
 }

 return (
 <div className="space-y-3">
 {items.map((item) => (
 <div className="border border-amber-200/80 bg-white p-4" key={`${item.kind}-${item.id}`}>
 <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
 <div>
 <p className="text-sm font-bold text-sp-navy">{item.personName}</p>
 <p className="mt-1 text-xs text-sp-navy-muted">
 {item.kind === "submission" ? "Challenge submission" : `Simulation • AI score ${item.score}`}
 </p>
 <p className="mt-1 text-sm text-sp-navy">{item.title}</p>
 {item.kind === "coaching" && item.simulationLabel ? (
 <p className="mt-1 text-xs text-sp-navy-muted">{item.simulationLabel}</p>
 ) : null}
 </div>
 <Button onClick={() => setActiveId(activeId === item.id ? null : item.id)} size="sm" variant="outline">
 Review
 </Button>
 </div>

 {item.kind === "coaching" && activeId === item.id ? (
 <div className="mt-4 space-y-4 border-t border-sp-blue/10 pt-4">
 <div className="grid gap-4 md:grid-cols-2">
 <div>
 <p className="text-sm font-semibold text-sp-navy">Strengths</p>
 <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-sp-navy-muted">
 {item.strengths.map((entry) => (
 <li key={entry}>{entry}</li>
 ))}
 </ul>
 </div>
 <div>
 <p className="text-sm font-semibold text-sp-navy">Gaps</p>
 <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-sp-navy-muted">
 {item.gaps.map((entry) => (
 <li key={entry}>{entry}</li>
 ))}
 </ul>
 </div>
 </div>
 <div>
 <p className="text-sm font-semibold text-sp-navy">Recommended next practice</p>
 <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-sp-navy-muted">
 {item.recommendedImprovements.map((entry) => (
 <li key={entry}>{entry}</li>
 ))}
 </ul>
 </div>
 <p className="bg-sp-blue-soft/40 p-4 text-sm leading-6 text-sp-navy-muted">
 {item.managerSummary}
 </p>
 {item.transcript ? (
 <div>
 <button
 className="flex items-center gap-2 text-sm font-semibold text-sp-blue"
 onClick={() => setExpandedTranscript(expandedTranscript === item.id ? null : item.id)}
 type="button"
 >
 {expandedTranscript === item.id ? (
 <ChevronUp className="h-4 w-4" />
 ) : (
 <ChevronDown className="h-4 w-4" />
 )}
 Full roleplay transcript
 </button>
 {expandedTranscript === item.id ? (
 <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap bg-slate-50 p-4 text-xs leading-5 text-slate-600">
 {item.transcript}
 </pre>
 ) : null}
 </div>
 ) : null}
 <Badge tone="amber">Awaiting your coaching feedback</Badge>
 </div>
 ) : null}

 {activeId === item.id ? (
 <div className="mt-4 space-y-3 border-t border-sp-blue/10 pt-4">
 <Textarea
 onChange={(event) => setFeedback(event.target.value)}
 placeholder="Coaching feedback for the SE — reference specific moments from the transcript…"
 value={feedback}
 />
 <label className="block text-sm font-semibold text-sp-navy-muted">
 Grade (1–5)
 <Input
 className="mt-1 max-w-[120px]"
 max={5}
 min={1}
 onChange={(event) => setGrade(event.target.value)}
 type="number"
 value={grade}
 />
 </label>
 <div className="flex flex-wrap gap-2">
 <Button
 disabled={isSaving || feedback.length < 3}
 onClick={() => void submitReview(item, "approve")}
 >
 {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
 Approve
 </Button>
 <Button
 disabled={isSaving || feedback.length < 3}
 onClick={() => void submitReview(item, "reject")}
 variant="outline"
 >
 <RotateCcw className="h-4 w-4" />
 Needs revision
 </Button>
 </div>
 </div>
 ) : null}
 </div>
 ))}
 </div>
 );
}
