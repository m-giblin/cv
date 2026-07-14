"use client";

import { CalendarDays, CheckCircle2, ClipboardList, Loader2, Pencil, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
 addDaysToIsoDate,
 sortPlanTemplates,
 stepTypeSummary,
 templateDurationDays,
 templateDurationLabel,
} from "@/lib/plans/template-catalog";
import type { Profile, UserPlan } from "@/lib/types";

type PlanTemplateStep = {
 id: string;
 title: string;
 description: string | null;
 step_type: string;
 sort_order: number;
 metadata: { dueOffsetDays?: number } | null;
};

type PlanTemplate = {
 id: string;
 name: string;
 description: string | null;
 steps: PlanTemplateStep[];
};

function todayIso() {
 return new Date().toISOString().slice(0, 10);
}

export function ManagerPlanAssignPanel({
 assignees,
 mentors,
 plans = [],
 defaultUserId,
 compact = false,
 onAssigned,
}: {
 assignees: Profile[];
 mentors: Profile[];
 plans?: UserPlan[];
 defaultUserId?: string;
 compact?: boolean;
 onAssigned?: () => void;
}) {
 const router = useRouter();
 const [templates, setTemplates] = useState<PlanTemplate[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [isSaving, setIsSaving] = useState(false);
 const [selectedTemplateId, setSelectedTemplateId] = useState("");
 const [userId, setUserId] = useState(defaultUserId ?? assignees[0]?.id ?? "");
 const [mentorId, setMentorId] = useState("");
 const [startDate, setStartDate] = useState(todayIso());

 useEffect(() => {
 if (defaultUserId) {
 setUserId(defaultUserId);
 }
 }, [defaultUserId]);

 useEffect(() => {
 void fetch("/api/plans/templates")
 .then((response) => (response.ok ? response.json() : { templates: [] }))
 .then((body: { templates: PlanTemplate[] }) => {
 const sorted = sortPlanTemplates(body.templates ?? []);
 setTemplates(sorted);
 if (sorted[0]) {
 setSelectedTemplateId((current) => current || sorted[0].id);
 }
 setIsLoading(false);
 })
 .catch(() => setIsLoading(false));
 }, []);

 const selectedTemplate = templates.find((template) => template.id === selectedTemplateId);
 const durationDays = selectedTemplate ? templateDurationDays(selectedTemplate.steps) : 14;
 const targetCompletion = addDaysToIsoDate(startDate, durationDays);

 const assigneePlan = useMemo(
 () => plans.find((plan) => plan.userId === userId),
 [plans, userId],
 );

 const seAssignees = assignees.filter((profile) =>
 ["basic_se", "senior_se", "advisory_solutions_consultant"].includes(profile.role),
 );

 async function handleAssign(event: React.FormEvent) {
 event.preventDefault();

 if (!selectedTemplateId || !userId) {
 toast.error("Pick a template and SE.");
 return;
 }

 setIsSaving(true);
 const response = await fetch("/api/plans/assignments", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 planId: selectedTemplateId,
 userId,
 mentorId: mentorId || null,
 startDate,
 targetCompletion,
 }),
 });

 setIsSaving(false);

 if (!response.ok) {
 toast.error("Could not assign plan.");
 return;
 }

 toast.success(`${selectedTemplate?.name ?? "Plan"} assigned — SE notified.`);
 onAssigned?.();
 router.refresh();
 }

 const assignStep = !selectedTemplateId ? 1 : !userId ? 2 : 3;

 if (isLoading) {
 return (
 <Card className="border-0 bg-transparent shadow-none" id={compact ? undefined : "onboarding-plans"}>
 <div className="flex justify-center py-10">
 <Loader2 className="h-6 w-6 animate-spin text-[#0071ce]" />
 </div>
 </Card>
 );
 }

 return (
 <Card className="scroll-mt-6 border-0 bg-transparent shadow-none" id={compact ? undefined : "onboarding-plans"}>
 <CardHeader className={compact ? "pb-3" : undefined}>
 <CardTitle className={`flex items-center gap-2 ${compact ? "text-base" : ""}`}>
 <ClipboardList className="h-5 w-5 text-[#0071ce]" />
 {compact ? "Assign onboarding plan" : "Onboarding plans"}
 </CardTitle>
 <CardDescription>
 Three steps: pick a week template → choose SE → confirm dates.
 </CardDescription>
 <ol className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
 {[
 { n: 1, label: "Template" },
 { n: 2, label: "SE & mentor" },
 { n: 3, label: "Confirm" },
 ].map((step) => (
 <li
 className={`border px-3 py-1.5 ${
 assignStep === step.n
 ? "border-[#0033a1]/30 bg-[#e8f2fc] text-[#0033a1]"
 : assignStep > step.n
 ? "border-emerald-200 bg-emerald-50 text-emerald-800"
 : "border-stone-200 bg-white text-stone-500"
 }`}
 key={step.n}
 >
 {step.n}. {step.label}
 </li>
 ))}
 </ol>
 </CardHeader>

 <div className="space-y-4 px-0 pb-0">
 <div className={`grid gap-2 ${compact ? "grid-cols-1 sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-3"}`}>
 {templates.map((template) => {
 const days = templateDurationDays(template.steps);
 const isSelected = template.id === selectedTemplateId;

 return (
 <button
 className={`border p-3 text-left transition ${
 isSelected
 ? "border-sp-blue/40 bg-sp-blue-soft/30 ring-2 ring-sp-blue/20"
 : "border-sp-blue/10 bg-white hover:border-sp-blue/25 hover:bg-sp-blue-soft/10"
 }`}
 key={template.id}
 onClick={() => setSelectedTemplateId(template.id)}
 type="button"
 >
 <div className="flex items-start justify-between gap-2">
 <p className="text-sm font-bold text-sp-navy">{template.name}</p>
 {isSelected ? <CheckCircle2 className="h-4 w-4 shrink-0 text-sp-blue" /> : null}
 </div>
 <p className="mt-1 line-clamp-2 text-xs text-sp-navy-muted">{template.description}</p>
 <div className="mt-2 flex flex-wrap gap-1.5">
 <Badge tone="blue">{templateDurationLabel(days)}</Badge>
 <Badge tone="slate">{template.steps.length} steps</Badge>
 </div>
 </button>
 );
 })}
 </div>

 {selectedTemplate ? (
 <div className="border border-sp-blue/10 bg-sp-blue-soft/15 p-4">
 <p className="text-xs font-bold uppercase tracking-wide text-sp-navy-muted">Template preview</p>
 <p className="mt-1 text-sm font-semibold text-sp-navy">{stepTypeSummary(selectedTemplate.steps)}</p>
 <ul className="mt-3 space-y-2">
 {selectedTemplate.steps.map((step) => (
 <li className="flex items-start justify-between gap-3 text-sm" key={step.id}>
 <span className="text-sp-navy">{step.title}</span>
 <span className="shrink-0 text-xs text-sp-navy-muted">
 Day {step.metadata?.dueOffsetDays ?? "—"}
 </span>
 </li>
 ))}
 </ul>
 </div>
 ) : null}

 <form className="space-y-3 border-t border-[#E2DFD9] pt-4" onSubmit={handleAssign}>
 <p className="text-xs font-bold uppercase tracking-wide text-[#6B6860]">Step 2–3</p>
 <div className={`grid gap-3 ${compact ? "grid-cols-1" : "sm:grid-cols-2"}`}>
 <label className="block space-y-1.5 text-sm">
 <span className="font-semibold text-sp-navy">Assign to</span>
 <select
 className="h-10 w-full border border-sp-blue/15 bg-white px-3"
 onChange={(event) => setUserId(event.target.value)}
 required
 value={userId}
 >
 <option disabled value="">
 Select SE
 </option>
 {seAssignees.map((profile) => (
 <option key={profile.id} value={profile.id}>
 {profile.fullName}
 </option>
 ))}
 </select>
 </label>

 <label className="block space-y-1.5 text-sm">
 <span className="font-semibold text-sp-navy">Mentor</span>
 <p className="text-xs text-sp-navy-muted">Any employee on your team — they coach; you sign off.</p>
 <select
 className="h-10 w-full border border-sp-blue/15 bg-white px-3"
 onChange={(event) => setMentorId(event.target.value)}
 value={mentorId}
 >
 <option value="">No mentor</option>
 {mentors.map((profile) => (
 <option key={profile.id} value={profile.id}>
 {profile.fullName}
 </option>
 ))}
 </select>
 </label>
 </div>

 <div className={`grid gap-3 ${compact ? "grid-cols-1" : "sm:grid-cols-2"}`}>
 <label className="block space-y-1.5 text-sm">
 <span className="font-semibold text-sp-navy">Start date</span>
 <Input onChange={(event) => setStartDate(event.target.value)} required type="date" value={startDate} />
 </label>
 <label className="block space-y-1.5 text-sm">
 <span className="font-semibold text-sp-navy">Target completion</span>
 <div className="flex h-10 items-center gap-2 border border-sp-blue/10 bg-sp-blue-soft/20 px-3 text-sm text-sp-navy-muted">
 <CalendarDays className="h-4 w-4 shrink-0" />
 {targetCompletion}
 <span className="text-xs">(auto)</span>
 </div>
 </label>
 </div>

 {assigneePlan ? (
 <p className="border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
 {assigneePlan.name} is already assigned ({assigneePlan.progress}% complete). Assigning adds another
 plan — consider editing on Plans instead.
 </p>
 ) : null}

 <div className="flex flex-col gap-2 sm:flex-row">
 <Button className="flex-1 whitespace-nowrap" disabled={isSaving || !selectedTemplateId} type="submit">
 {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
 Assign plan
 </Button>
 <Button asChild className="flex-1 whitespace-nowrap" type="button" variant="outline">
 <Link href="/plans">
 <Pencil className="h-4 w-4" />
 Customize templates
 </Link>
 </Button>
 </div>
 </form>
 </div>
 </Card>
 );
}
