"use client";

import { Loader2, MessageCircleQuestion } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function CorpusFeedbackWidget({
 contentAssetId,
 assetTitle,
}: {
 contentAssetId: string;
 assetTitle: string;
}) {
 const [comment, setComment] = useState("");
 const [question, setQuestion] = useState("");
 const [loading, setLoading] = useState(false);

 async function submit(confusing: boolean) {
 setLoading(true);
 try {
 const response = await fetch("/api/corpus/feedback", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 contentAssetId,
 isConfusing: confusing,
 comment: comment.trim() || undefined,
 question: question.trim() || undefined,
 }),
 });
 if (!response.ok) {
 toast.error("Could not send feedback.");
 return;
 }
 const body = (await response.json()) as { routed?: boolean };
 toast.success(
 body.routed
 ? "Feedback sent. Your question went to the SME channel."
 : "Thanks. Your feedback is recorded for admin review.",
 );
 setComment("");
 setQuestion("");
 } finally {
 setLoading(false);
 }
 }

 return (
 <div className="rounded-[14px] border border-line bg-white p-4 text-sm">
 <p className="flex items-center gap-2 text-[15px] font-bold text-ink">
 <MessageCircleQuestion aria-hidden className="h-4 w-4 text-blue" />
 Feedback on {assetTitle}
 </p>
 <Textarea
 aria-label="What's confusing about this resource?"
 className="mt-2"
 onChange={(event) => setComment(event.target.value)}
 placeholder="What's confusing about this resource?"
 rows={2}
 value={comment}
 />
 <Textarea
 aria-label="Ask a question"
 className="mt-2"
 onChange={(event) => setQuestion(event.target.value)}
 placeholder="Ask a question. It goes to the SME for this project tag."
 rows={2}
 value={question}
 />
 <div className="mt-2 flex flex-wrap gap-2">
 <Button disabled={loading} onClick={() => void submit(true)} size="sm" type="button" variant="secondary">
 {loading ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
 {loading ? "Sending…" : "Flag as confusing"}
 </Button>
 <Button
 disabled={loading || !question.trim()}
 onClick={() => void submit(false)}
 size="sm"
 type="button"
 variant="secondary"
 >
 Ask an SME
 </Button>
 </div>
 </div>
 );
}
