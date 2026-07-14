"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CorpusFeedbackWidget } from "@/components/corpus/corpus-feedback-widget";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlanStep } from "@/lib/types";

export function PlanStepActions({
 step,
 mentorName,
}: {
 step: PlanStep;
 mentorName?: string;
}) {
 const router = useRouter();
 const [isSaving, setIsSaving] = useState(false);
 const [shadowNotes, setShadowNotes] = useState("");
 const [mentorTopic, setMentorTopic] = useState("");
 const [contentNotes, setContentNotes] = useState("");

 const awaitingReview = step.status === "submitted";
 const needsRevision = step.status === "in_progress" && Boolean(step.description);

 if (step.locked) {
 return (
 <Card className="border-stone-200 bg-stone-50/60">
 <CardHeader>
 <CardTitle>{step.title}</CardTitle>
 <CardDescription>
 Complete the prior segment gate to unlock this step (segment {step.segmentIndex ?? "?"}).
 </CardDescription>
 </CardHeader>
 </Card>
 );
 }

 async function submitStep(notes?: string) {
 if (!step.assignmentStepId) {
 toast.error("This step is not linked to an active plan assignment.");
 return;
 }

 setIsSaving(true);
 const response = await fetch(`/api/plans/steps/${step.assignmentStepId}`, {
 method: "PATCH",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ notes }),
 });

 if (!response.ok) {
 toast.error("Could not submit step.");
 setIsSaving(false);
 return;
 }

 toast.success("Submitted for manager/mentor review.");
 router.push("/dashboard");
 router.refresh();
 }

 if (awaitingReview) {
 return (
 <Card className="border-amber-200 bg-amber-50/50">
 <CardHeader>
 <CardTitle>{step.title}</CardTitle>
 <CardDescription>
 Your work is submitted and awaiting validation from your manager or mentor. You&apos;ll be notified when
 it&apos;s approved or if you need to try again.
 </CardDescription>
 </CardHeader>
 <StatusBadge status="submitted" />
 </Card>
 );
 }

 if (step.type === "content_review") {
 return (
 <Card>
 <CardHeader>
 <CardTitle>{step.title}</CardTitle>
 <CardDescription>
 {needsRevision
 ? "Your manager or mentor asked you to review this again. Open the resource, then resubmit."
 : step.description}
 </CardDescription>
 </CardHeader>
 <div className="space-y-4">
 {step.resourceUrl ? (
 <a
 className="font-semibold text-sp-blue hover:text-sp-blue-deep"
 href={step.resourceUrl}
 rel="noreferrer"
 target="_blank"
 >
 Open resource →
 </a>
 ) : (
 <p className="text-sm text-sp-navy-muted">Browse the resource library for related materials.</p>
 )}
 <Textarea
 onChange={(e) => setContentNotes(e.target.value)}
 placeholder="What did you learn? Summarize key takeaways for your reviewer…"
 required
 rows={4}
 value={contentNotes}
 />
 <Button
 disabled={isSaving || contentNotes.trim().length < 10}
 onClick={() => void submitStep(contentNotes.trim())}
 >
 Submit for review
 </Button>
 {step.contentAssetId ? (
 <CorpusFeedbackWidget contentAssetId={step.contentAssetId} assetTitle={step.title} />
 ) : null}
 </div>
 </Card>
 );
 }

 if (step.type === "shadow_meeting_log") {
 return (
 <Card>
 <CardHeader>
 <CardTitle>Log shadow meeting</CardTitle>
 <CardDescription>{step.description}</CardDescription>
 </CardHeader>
 <form
 className="space-y-3"
 onSubmit={async (event) => {
 event.preventDefault();
 setIsSaving(true);
 const response = await fetch("/api/shadow-logs", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 assignmentStepId: step.assignmentStepId,
 notes: shadowNotes,
 }),
 });
 if (!response.ok) {
 toast.error("Could not save shadow log.");
 setIsSaving(false);
 return;
 }
 toast.success("Shadow log submitted for review.");
 router.push("/dashboard");
 router.refresh();
 }}
 >
 <Textarea
 onChange={(e) => setShadowNotes(e.target.value)}
 placeholder="What did you observe? Key takeaways from the call…"
 required
 value={shadowNotes}
 />
 <Button disabled={isSaving} type="submit">
 Submit for review
 </Button>
 </form>
 </Card>
 );
 }

 if (step.type === "deal_prep") {
 const prepHref = step.assignmentStepId
 ? `/prep?step=${step.assignmentStepId}`
 : "/prep";

 return (
 <Card>
 <CardHeader>
 <CardTitle>{step.title}</CardTitle>
 <CardDescription>
 {step.description ||
 "Generate an account-specific deal prep brief. Saving the brief submits this step for manager review."}
 </CardDescription>
 </CardHeader>
 <Button asChild>
 <Link href={prepHref}>Open deal prep →</Link>
 </Button>
 </Card>
 );
 }

 if (step.type === "custom" && step.assignmentStepId?.startsWith("adhoc-")) {
 return (
 <Card>
 <CardHeader>
 <CardTitle>{step.title}</CardTitle>
 <CardDescription>
 {step.description || "Manager-assigned task — complete the work, then submit for manager live sign-off."}
 </CardDescription>
 </CardHeader>
 <form
 className="space-y-3"
 onSubmit={async (event) => {
 event.preventDefault();
 setIsSaving(true);
 const response = await fetch(`/api/plans/steps/${step.assignmentStepId}`, {
 method: "PATCH",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ notes: contentNotes.trim() }),
 });
 if (!response.ok) {
 toast.error("Could not submit task.");
 setIsSaving(false);
 return;
 }
 toast.success("Submitted for manager sign-off.");
 router.push("/dashboard");
 router.refresh();
 }}
 >
 <Textarea
 onChange={(e) => setContentNotes(e.target.value)}
 placeholder="What did you complete? Summarize for your manager's live validation…"
 required
 rows={4}
 value={contentNotes}
 />
 <Button disabled={isSaving || contentNotes.trim().length < 10} type="submit">
 Submit for manager sign-off
 </Button>
 </form>
 </Card>
 );
 }

 if (step.type === "mentor_review") {
 return (
 <Card>
 <CardHeader>
 <CardTitle>Request mentor review</CardTitle>
 <CardDescription>
 {mentorName ? `Your mentor: ${mentorName}` : step.description}
 </CardDescription>
 </CardHeader>
 <form
 className="space-y-3"
 onSubmit={async (event) => {
 event.preventDefault();
 setIsSaving(true);
 const response = await fetch("/api/mentor-reviews", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 assignmentStepId: step.assignmentStepId,
 topic: mentorTopic,
 }),
 });
 if (!response.ok) {
 toast.error("Could not request mentor review.");
 setIsSaving(false);
 return;
 }
 toast.success("Submitted for mentor review.");
 router.push("/dashboard");
 router.refresh();
 }}
 >
 <Input
 onChange={(e) => setMentorTopic(e.target.value)}
 placeholder="Topic for mentor discussion"
 required
 value={mentorTopic}
 />
 <Button disabled={isSaving} type="submit">
 Submit for mentor review
 </Button>
 </form>
 </Card>
 );
 }

 return (
 <Card>
 <CardHeader>
 <CardTitle>{step.title}</CardTitle>
 <CardDescription>Complete the activity, then your manager or mentor validates it.</CardDescription>
 </CardHeader>
 <Button asChild>
 <Link href={stepLinkForType(step.type)}>Continue</Link>
 </Button>
 </Card>
 );
}

function stepLinkForType(type: PlanStep["type"]) {
 switch (type) {
 case "challenge":
 return "/challenges";
 case "simulation":
 return "/simulations";
 case "deal_prep":
 return "/prep";
 default:
 return "/dashboard";
 }
}
