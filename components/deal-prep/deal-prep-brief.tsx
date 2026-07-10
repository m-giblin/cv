"use client";

import Link from "next/link";
import {
 Loader2,
 Mic,
 Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { SP_BLUE_BTN, SP_OUTLINE_BTN } from "@/components/se/sp-form-primitives";
import { BuyerSharePanel } from "@/components/buyer-shares/buyer-share-panel";
import type { DealPrepOutput } from "@/lib/ai/schemas";
import { formatPrepAsMarkdown } from "@/lib/deal-prep/export";
import type { DealPrepFormValues } from "@/components/deal-prep/deal-prep-form";
import { DEAL_STAGES, MEETING_TYPES } from "@/lib/deal-prep/templates";
import { cn } from "@/lib/utils";

type ContentAsset = { id: string; title: string; url: string; category: string };

function normalizeBrief(result: DealPrepOutput): DealPrepOutput {
 return {
 ...result,
 stakeholderMap: result.stakeholderMap ?? [],
 competitiveLandmines: result.competitiveLandmines ?? [],
 proofPoints: result.proofPoints ?? [],
 riskFlags: result.riskFlags ?? [],
 oneThingToNail: result.oneThingToNail ?? "",
 linkedResources: result.linkedResources ?? [],
 };
}

const REGENERATE_FOCUS_OPTIONS = [
 "Make objections harder",
 "Add NHI / machine identity angle",
 "Shorten for a 30-min exec call",
 "Emphasize competitive differentiation",
];

export function DealPrepBrief({
 result,
 sessionId,
 sharedWithManager,
 debriefNotes: initialDebrief,
 onRegenerate,
 isRegenerating,
 onPracticeObjection,
 activePracticeObjection,
 formContext,
}: {
 result: DealPrepOutput;
 sessionId: string | null;
 sharedWithManager: boolean;
 debriefNotes: string;
 onRegenerate: (focus: string) => void;
 isRegenerating: boolean;
 onPracticeObjection: (objection: string) => void;
 activePracticeObjection: string | null;
 formContext?: Pick<
   DealPrepFormValues,
   "attendees" | "dealStage" | "meetingType" | "competitors" | "solutions"
 >;
}) {
 const brief = normalizeBrief(result);
 const [assets, setAssets] = useState<ContentAsset[]>([]);
 const [debriefNotes, setDebriefNotes] = useState(initialDebrief);
 const [shared, setShared] = useState(sharedWithManager);
 const [savingMeta, setSavingMeta] = useState(false);

 useEffect(() => {
 setDebriefNotes(initialDebrief);
 setShared(sharedWithManager);
 }, [initialDebrief, sharedWithManager, sessionId]);

 useEffect(() => {
 void fetch("/api/content")
 .then((response) => (response.ok ? response.json() : { assets: [] }))
 .then((body: { assets: ContentAsset[] }) => setAssets(body.assets ?? []))
 .catch(() => setAssets([]));
 }, []);

 const resolveResourceLink = useCallback(
 (label: string) => {
 const normalized = label.toLowerCase();
 const match = assets.find(
 (asset) =>
 asset.title.toLowerCase().includes(normalized) ||
 normalized.includes(asset.title.toLowerCase().slice(0, 12)),
 );
 return match?.url ?? `/resources?q=${encodeURIComponent(label)}`;
 },
 [assets],
 );

 async function copyMarkdown() {
 await navigator.clipboard.writeText(formatPrepAsMarkdown(brief, false));
 toast.success("Full brief copied.");
 }

 function downloadMarkdown() {
 const blob = new Blob([formatPrepAsMarkdown(brief, false)], { type: "text/markdown" });
 const url = URL.createObjectURL(blob);
 const anchor = document.createElement("a");
 anchor.href = url;
 anchor.download = `deal-prep-${brief.accountName.replace(/\s+/g, "-").toLowerCase()}.md`;
 anchor.click();
 URL.revokeObjectURL(url);
 }

 async function openPractice(objection: string) {
 onPracticeObjection(objection);
 }

 async function saveSessionMeta(updates: {
 debriefNotes?: string;
 sharedWithManager?: boolean;
 }) {
 if (!sessionId) return;

 setSavingMeta(true);
 const response = await fetch(`/api/deal-prep/sessions/${sessionId}`, {
 method: "PATCH",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 debriefNotes: updates.debriefNotes,
 sharedWithManager: updates.sharedWithManager,
 }),
 });
 setSavingMeta(false);

 if (!response.ok) {
 toast.error("Could not save updates.");
 return;
 }

 if (updates.sharedWithManager) {
 toast.success("Brief shared with your manager — added to their inbox.");
 } else {
 toast.success("Saved.");
 }
 }

 const meetingLabel =
 MEETING_TYPES.find((item) => item.value === formContext?.meetingType)?.label ?? "Discovery call";
 const stageLabel =
 DEAL_STAGES.find((item) => item.value === formContext?.dealStage)?.label ?? "Qualify";
 const competitor = formContext?.competitors?.trim() || "competitors";
 const painHint = formContext?.solutions?.split(",")[0]?.trim() || "IGA / NHI pain";
 const attendeeLine = formContext?.attendees?.trim() || brief.buyerPersona || "Key stakeholders";

 return (
 <div className="min-h-full bg-white">
 <div className="border-b border-[#ECEAE6] bg-gradient-to-br from-[#FFFBF0] to-white px-7 py-5">
 <p className="mb-1 font-mono text-[8.5px] uppercase tracking-[0.16em] text-[#D4810A]">
 AI-generated · {meetingLabel} · {new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
 </p>
 <h2 className="font-display text-[22px] font-extrabold leading-none tracking-[-0.03em] text-[#0D0E12]">
 {brief.accountName} — Discovery Brief
 </h2>
 <p className="mt-1 text-xs text-[#6B6860]">
 {attendeeLine} · {painHint} · {stageLabel} stage
 </p>
 <div className="mt-3 flex flex-wrap gap-1.5">
 <button className={SP_OUTLINE_BTN} onClick={() => void copyMarkdown()} type="button">
 Copy brief
 </button>
 <button className={SP_OUTLINE_BTN} onClick={downloadMarkdown} type="button">
 Export PDF
 </button>
 {sessionId ? (
 <button
 className="inline-flex items-center bg-[#0033A1] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#002878]"
 disabled={savingMeta}
 onClick={() => void saveSessionMeta({ sharedWithManager: true })}
 type="button"
 >
 Save to plan step →
 </button>
 ) : null}
 </div>
 {brief.oneThingToNail ? (
 <p className="mt-3 text-[11px] leading-relaxed text-[#3D3C38]">
 <span className="font-semibold text-[#0D0E12]">One thing to nail:</span> {brief.oneThingToNail}
 </p>
 ) : null}
 <div className="mt-2 flex flex-wrap gap-1.5">
 {REGENERATE_FOCUS_OPTIONS.map((focus) => (
 <button
 className={cn(SP_OUTLINE_BTN, "px-2 py-1 text-[10px]")}
 disabled={isRegenerating}
 key={focus}
 onClick={() => onRegenerate(focus)}
 type="button"
 >
 {isRegenerating ? <Loader2 className="inline h-3 w-3 animate-spin" /> : null}
 {focus}
 </button>
 ))}
 </div>
 </div>

 <div className="space-y-4 px-7 py-5">
 <HandoffBriefSection
 bullet="—"
 color="#0071CE"
 items={brief.discoveryQuestions}
 title="Discovery questions"
 />
 <HandoffObjectionSection
 accountName={brief.accountName}
 activeObjection={activePracticeObjection}
 color="#D4810A"
 industry={result.industry}
 items={brief.likelyObjections}
 onPractice={openPractice}
 prepSessionId={sessionId}
 solutionFocus={brief.solutions[0]}
 />
 <HandoffBriefSection
 bullet="›"
 color="#5b21b6"
 items={brief.competitiveLandmines}
 title={`Competitive positioning vs. ${competitor}`}
 />
 {brief.proofPoints.length > 0 ? (
 <HandoffBriefSection bullet="—" color="#0071CE" items={brief.proofPoints} title="Proof points to bring" />
 ) : null}
 {brief.riskFlags.length > 0 ? (
 <HandoffBriefSection bullet="!" color="#D4810A" items={brief.riskFlags} title="Risk flags" />
 ) : null}
 {brief.stakeholderMap.length > 0 ? (
 <HandoffBriefSection bullet="—" color="#0071CE" items={brief.stakeholderMap} title="Stakeholder map" />
 ) : null}

 <BuyerSharePanel accountName={brief.accountName} prep={{ ...result, accountName: brief.accountName }} sessionId={sessionId} />

 {sessionId ? (
 <div className="space-y-3 border-t border-[#ECEAE6] pt-4">
 <label className="flex cursor-pointer items-center gap-2 text-xs text-[#3D3C38]">
 <input
 checked={shared}
 onChange={(event) => {
 const next = event.target.checked;
 setShared(next);
 void saveSessionMeta({ sharedWithManager: next });
 }}
 type="checkbox"
 />
 Share brief with manager for review
 </label>
 <div>
 <p className="mb-1 font-mono text-[8px] uppercase tracking-[0.1em] text-[#B0ADA8]">Post-call debrief</p>
 <Textarea
 className="min-h-[52px] resize-none border-[#E2DFD9] bg-[#F9F8F6] text-xs"
 onChange={(event) => setDebriefNotes(event.target.value)}
 placeholder="What landed? What surprised you?"
 rows={3}
 value={debriefNotes}
 />
 <button
 className={cn(SP_OUTLINE_BTN, "mt-2")}
 disabled={savingMeta}
 onClick={() => void saveSessionMeta({ debriefNotes })}
 type="button"
 >
 {savingMeta ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
 Save debrief
 </button>
 </div>
 </div>
 ) : null}
 </div>
 </div>
 );
}

function HandoffBriefSection({
 title,
 items,
 color,
 bullet,
}: {
 title: string;
 items: string[];
 color: string;
 bullet: string;
}) {
 if (!items.length) return null;

 const bg =
 color === "#0071CE" ? "#F0F7FF" : color === "#D4810A" ? "#FFFBF0" : "#faf8ff";

 return (
 <div className="px-4 py-3" style={{ borderLeft: `3px solid ${color}`, background: bg }}>
 <p
 className="mb-2 font-mono text-[8px] uppercase tracking-[0.14em]"
 style={{ color }}
 >
 {title}
 </p>
 <div className="flex flex-col gap-1.5">
 {items.map((item) => (
 <div className="flex items-start gap-2" key={item}>
 <span className="mt-0.5 shrink-0 font-mono text-[10px]" style={{ color }}>
 {bullet}
 </span>
 <span className="text-[11.5px] leading-relaxed text-[#1A1A1A]">{item}</span>
 </div>
 ))}
 </div>
 </div>
 );
}

type PracticeObjectionContext = {
 accountName: string;
 industry: string;
 solutionFocus?: string;
 prepSessionId: string | null;
};

function buildPracticeObjectionBody(objection: string, ctx: PracticeObjectionContext) {
 const body: Record<string, string> = {
 objection,
 accountName: ctx.accountName,
 industry: ctx.industry?.trim() || "Enterprise",
 };
 const solution = ctx.solutionFocus?.trim();
 if (solution && solution.length >= 2) {
 body.solutionFocus = solution;
 }
 if (ctx.prepSessionId) {
 body.prepSessionId = ctx.prepSessionId;
 }
 return body;
}

async function startDealPrepPractice(
 objection: string,
 ctx: PracticeObjectionContext,
 onFallback: (objection: string) => void,
) {
 try {
 const response = await fetch("/api/deal-prep/practice-objection", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify(buildPracticeObjectionBody(objection, ctx)),
 });

 if (!response.ok) {
 onFallback(objection);
 return;
 }

 const body = (await response.json()) as { redirectUrl?: string };
 if (body.redirectUrl) {
 window.location.href = body.redirectUrl;
 return;
 }

 onFallback(objection);
 } catch {
 onFallback(objection);
 }
}

function HandoffObjectionSection({
 title = "Likely objections",
 items,
 color,
 bullet = "!",
 onPractice,
 activeObjection,
 accountName,
 industry,
 solutionFocus,
 prepSessionId,
}: {
 title?: string;
 items: string[];
 color: string;
 bullet?: string;
 onPractice: (objection: string) => void;
 activeObjection: string | null;
 accountName: string;
 industry: string;
 solutionFocus?: string;
 prepSessionId: string | null;
}) {
 if (!items.length) return null;

 const practiceContext = { accountName, industry, solutionFocus, prepSessionId };
 const bg = color === "#D4810A" ? "#FFFBF0" : "#F0F7FF";

 async function startObjectionPractice(objection: string) {
 await startDealPrepPractice(objection, practiceContext, onPractice);
 }

 return (
 <div className="px-4 py-3" style={{ borderLeft: `3px solid ${color}`, background: bg }}>
 <p className="mb-2 font-mono text-[8px] uppercase tracking-[0.14em]" style={{ color }}>
 {title}
 </p>
 <div className="flex flex-col gap-2">
 {items.map((item) => {
 const isActive = activeObjection === item;
 return (
 <div className="flex items-start justify-between gap-2" key={item}>
 <div className="flex items-start gap-2">
 <span className="mt-0.5 shrink-0 font-mono text-[10px]" style={{ color }}>
 {bullet}
 </span>
 <span className="text-[11.5px] leading-relaxed text-[#1A1A1A]">{item}</span>
 </div>
 <button
 className={isActive ? SP_BLUE_BTN : SP_OUTLINE_BTN}
 onClick={() => void startObjectionPractice(item)}
 type="button"
 >
 <Mic className="h-3 w-3" />
 Practice
 </button>
 </div>
 );
 })}
 </div>
 </div>
 );
}

export function DealPrepBriefEmpty() {
 return (
 <div className="flex min-h-full flex-col items-center justify-center bg-gradient-to-br from-[#FFFBF0] to-white px-8 py-16 text-center">
 <Sparkles className="mb-3 h-8 w-8 text-[#D4810A]/40" />
 <p className="font-display text-lg font-bold text-[#0D0E12]">Your brief appears here</p>
 <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#6B6860]">
 Fill in account details on the left and hit Generate brief — discovery questions, objections, and competitive positioning land in this panel.
 </p>
 </div>
 );
}
