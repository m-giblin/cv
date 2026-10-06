"use client";

import { format, parseISO } from "date-fns";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Stamp } from "@/components/ui/stamp";
import { rowHighlight } from "@/components/ui/table";
import { Tag } from "@/components/ui/tag";
import {
 addDaysToIsoDate,
 sortPlanTemplates,
 stepTypeSummary,
 templateDurationDays,
 templateDurationLabel,
} from "@/lib/plans/template-catalog";
import type { Profile, UserPlan } from "@/lib/types";
import { cn } from "@/lib/utils";

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

const INPUT_CLASS =
 "w-full rounded-[10px] border border-line-strong bg-white px-3 py-2 text-[15px] font-normal text-ink";
const LABEL_CLASS = "block space-y-1.5 text-sm font-semibold text-ink";

function displayDate(iso: string) {
 try {
 return format(parseISO(iso), "EEE, MMM d");
 } catch {
 return iso;
 }
}

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

 toast.success(`${selectedTemplate?.name ?? "Plan"} assigned. The SE has been notified.`);
 onAssigned?.();
 router.refresh();
 }

 const assignStep = !selectedTemplateId ? 1 : !userId ? 2 : 3;

 if (isLoading) {
 return (
 <section className="scroll-mt-6" id={compact ? undefined : "onboarding-plans"}>
 <div className="flex justify-center py-10" role="status">
 <Loader2 aria-hidden className="h-6 w-6 animate-spin text-blue" />
 <span className="sr-only">Loading plan templates</span>
 </div>
 </section>
 );
 }

 return (
 <section className="min-w-0 scroll-mt-6 space-y-4" id={compact ? undefined : "onboarding-plans"}>
 <div>
 <h3 className="text-lg font-extrabold text-ink">
 {compact ? "Assign onboarding plan" : "Onboarding plans"}
 </h3>
 <p className="mt-1 text-sm text-muted">
 Pick a week template, choose the SE and mentor, then confirm dates.
 </p>
 <ol className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
 {[
 { n: 1, label: "Template" },
 { n: 2, label: "SE and mentor" },
 { n: 3, label: "Confirm" },
 ].map((step) => (
 <li
 aria-current={assignStep === step.n ? "step" : undefined}
 className={cn(
 "inline-flex items-center gap-2 text-[13px] font-semibold whitespace-nowrap",
 assignStep === step.n ? "text-ink" : "text-muted",
 )}
 key={step.n}
 >
 <Stamp
 size={18}
 state={assignStep > step.n ? "earned" : assignStep === step.n ? "partial" : "none"}
 />
 {step.label}
 </li>
 ))}
 </ol>
 </div>

 <div className="space-y-4">
 <p className="label-caps">Step 1, template</p>
 <ul className={`grid gap-2 ${compact ? "grid-cols-1" : "sm:grid-cols-2 xl:grid-cols-3"}`}>
 {templates.map((template) => {
 const days = templateDurationDays(template.steps);
 const isSelected = template.id === selectedTemplateId;

 return (
 <li className="min-w-0" key={template.id}>
 <button
 aria-pressed={isSelected}
 className={cn(
 "h-full w-full rounded-[14px] border border-line p-3.5 text-left transition-colors",
 isSelected ? rowHighlight.selected : "bg-white hover:bg-bg",
 )}
 onClick={() => setSelectedTemplateId(template.id)}
 type="button"
 >
 <div className="flex items-start justify-between gap-2">
 <p className="text-[15px] font-bold text-ink">{template.name}</p>
 {isSelected ? <Stamp size={18} state="earned" /> : null}
 </div>
 {template.description ? (
 <p className="mt-1 line-clamp-2 text-sm text-muted">{template.description}</p>
 ) : null}
 <div className="mt-2 flex flex-wrap gap-1.5">
 <Tag tone="blue">{templateDurationLabel(days)}</Tag>
 <Tag>{template.steps.length} steps</Tag>
 </div>
 </button>
 </li>
 );
 })}
 </ul>

 {selectedTemplate ? (
 <div className="rounded-[14px] border border-line bg-white px-4 py-3.5">
 <p className="label-caps">Template preview</p>
 <p className="mt-1 text-[15px] font-bold text-ink">{stepTypeSummary(selectedTemplate.steps)}</p>
 <ul className="mt-3 space-y-2">
 {selectedTemplate.steps.map((step) => (
 <li className="flex items-start justify-between gap-3 text-sm" key={step.id}>
 <span className="min-w-0 text-ink-2">{step.title}</span>
 <span className="num shrink-0 text-[13px] text-muted">
 {step.metadata?.dueOffsetDays !== undefined ? `Day ${step.metadata.dueOffsetDays}` : "No due day"}
 </span>
 </li>
 ))}
 </ul>
 </div>
 ) : null}

 <form className="space-y-4 border-t border-divider pt-4" onSubmit={handleAssign}>
 <p className="label-caps">Steps 2 and 3, SE, mentor and dates</p>
 <div className={`grid gap-4 ${compact ? "grid-cols-1" : "sm:grid-cols-2"}`}>
 <label className={LABEL_CLASS}>
 <span className="block">Assign to</span>
 <select
 className={INPUT_CLASS}
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

 <label className={LABEL_CLASS}>
 <span className="block">Mentor</span>
 <span className="block text-sm font-normal text-muted">
 Anyone on your team. They coach; you sign off.
 </span>
 <select
 className={INPUT_CLASS}
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

 <div className={`grid gap-4 ${compact ? "grid-cols-1" : "sm:grid-cols-2"}`}>
 <label className={LABEL_CLASS}>
 <span className="block">Start date</span>
 <input
 className={INPUT_CLASS}
 onChange={(event) => setStartDate(event.target.value)}
 required
 type="date"
 value={startDate}
 />
 </label>
 <div className={LABEL_CLASS}>
 <span className="block">Target completion</span>
 <div className="flex items-center gap-2 rounded-[10px] bg-surface-2 px-3 py-2 text-[15px] font-normal text-ink-2">
 <span>{displayDate(targetCompletion)}</span>
 <span className="text-[13px] text-muted">Set from the template</span>
 </div>
 </div>
 </div>

 {assigneePlan ? (
 <p className="rounded-[14px] bg-signal-soft px-4 py-3 text-sm text-ink-2">
 <span className="font-bold text-warning">{assigneePlan.name} is already assigned</span> and{" "}
 {assigneePlan.progress}% complete. Assigning adds another plan, so consider editing it on Plans instead.
 </p>
 ) : null}

 <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
 <button
 className="btn-secondary inline-flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
 disabled={isSaving || !selectedTemplateId}
 type="submit"
 >
 {isSaving ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
 Assign plan
 </button>
 <Link className="link text-sm" href="/plans">
 Customize templates
 </Link>
 </div>
 </form>
 </div>
 </section>
 );
}
