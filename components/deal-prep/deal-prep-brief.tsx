"use client";

import { Loader2, Mic } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Tag } from "@/components/ui/tag";
import { H2_CLS, LABEL_CLS, LINE_CARD_CLS, TEXTAREA_CLS } from "@/components/se/form-classes";
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
 outcome: initialOutcome,
 onOutcomeChange,
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
 outcome?: "pending" | "won" | "lost";
 onOutcomeChange?: (outcome: "pending" | "won" | "lost") => void;
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
 const [outcome, setOutcome] = useState(initialOutcome ?? "pending");
 const [savingMeta, setSavingMeta] = useState(false);

 useEffect(() => {
 setDebriefNotes(initialDebrief);
 setShared(sharedWithManager);
 setOutcome(initialOutcome ?? "pending");
 }, [initialDebrief, sharedWithManager, initialOutcome, sessionId]);

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
 return match?.url ?? `/learn?q=${encodeURIComponent(label)}`;
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
 outcome?: "pending" | "won" | "lost";
 }) {
 if (!sessionId) return;

 setSavingMeta(true);
 const response = await fetch(`/api/deal-prep/sessions/${sessionId}`, {
 method: "PATCH",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 debriefNotes: updates.debriefNotes,
 sharedWithManager: updates.sharedWithManager,
 outcome: updates.outcome,
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
    <div className="flex flex-col gap-5">
      <section aria-labelledby="deal-prep-brief-title" className={cn(LINE_CARD_CLS, "flex flex-col gap-3 px-5 py-[18px]")}>
        <p className="label-mono">
          AI-generated · {meetingLabel} ·{" "}
          {new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        </p>
        <h2 className="text-2xl font-extrabold tracking-[-0.015em] text-ink" id="deal-prep-brief-title">
          {brief.accountName} — discovery brief
        </h2>
        <p className="text-sm text-ink-2">
          {attendeeLine} · {painHint} · {stageLabel} stage
        </p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => void copyMarkdown()} type="button">
            Copy brief
          </button>
          <button className="btn-secondary" onClick={downloadMarkdown} type="button">
            Export PDF
          </button>
          {sessionId ? (
            <button
              className="btn-secondary disabled:opacity-60"
              disabled={savingMeta}
              onClick={() => void saveSessionMeta({ sharedWithManager: true })}
              type="button"
            >
              Save to plan step →
            </button>
          ) : null}
        </div>
        {brief.oneThingToNail ? (
          <p className="rounded-[10px] bg-blue-soft px-4 py-3 text-[15px] leading-[1.5] text-ink">
            <span className="font-bold">One thing to nail:</span> {brief.oneThingToNail}
          </p>
        ) : null}
        <div className="flex flex-col gap-2">
          <span className="label-mono" id="deal-prep-regenerate-label">
            Regenerate with a focus
          </span>
          <div aria-labelledby="deal-prep-regenerate-label" className="flex flex-wrap gap-2" role="group">
            {REGENERATE_FOCUS_OPTIONS.map((focus) => (
              <button
                className={SMALL_BTN_CLS}
                disabled={isRegenerating}
                key={focus}
                onClick={() => onRegenerate(focus)}
                type="button"
              >
                {isRegenerating ? <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" /> : null}
                {focus}
              </button>
            ))}
          </div>
        </div>
        {isRegenerating ? (
          <p className="text-sm text-muted" role="status">
            Regenerating brief…
          </p>
        ) : null}
      </section>

      <HandoffBriefSection bullet="→" items={brief.discoveryQuestions} label="Ask" title="Discovery questions" />
      <HandoffObjectionSection
        accountName={brief.accountName}
        activeObjection={activePracticeObjection}
        industry={result.industry}
        items={brief.likelyObjections}
        onPractice={openPractice}
        prepSessionId={sessionId}
        solutionFocus={brief.solutions[0]}
      />
      <HandoffBriefSection
        bullet="◆"
        items={brief.competitiveLandmines}
        label="Compete"
        title={`Competitive positioning vs. ${competitor}`}
      />
      {brief.proofPoints.length > 0 ? (
        <HandoffBriefSection bullet="✓" items={brief.proofPoints} label="Proof" title="Proof points to bring" />
      ) : null}
      {brief.riskFlags.length > 0 ? (
        <HandoffBriefSection bullet="▲" items={brief.riskFlags} label="Risk" title="Risk flags" tone="danger" />
      ) : null}
      {brief.stakeholderMap.length > 0 ? (
        <HandoffBriefSection bullet="●" items={brief.stakeholderMap} label="People" title="Stakeholder map" />
      ) : null}

      <BuyerSharePanel accountName={brief.accountName} prep={{ ...result, accountName: brief.accountName }} sessionId={sessionId} />

      {sessionId ? (
        <section aria-labelledby="deal-prep-after-call" className={cn(LINE_CARD_CLS, "flex flex-col gap-5 px-5 py-[18px]")}>
          <div className="flex flex-col gap-1">
            <span className="label-mono">After the call</span>
            <h2 className={H2_CLS} id="deal-prep-after-call">
              Debrief and outcome
            </h2>
          </div>
          <label className="flex cursor-pointer items-center gap-2.5 text-[15px] text-ink">
            <input
              checked={shared}
              className="h-4 w-4 accent-blue"
              onChange={(event) => {
                const next = event.target.checked;
                setShared(next);
                void saveSessionMeta({ sharedWithManager: next });
              }}
              type="checkbox"
            />
            Share brief with manager for review
          </label>
          <div className="flex flex-col gap-2">
            <span className={LABEL_CLS} id="deal-prep-outcome-label">
              Deal outcome
            </span>
            <p className="text-[13px] leading-[1.45] text-muted">
              Tagging real outcomes lets us check whether readiness scores actually track deal results.
            </p>
            <div aria-labelledby="deal-prep-outcome-label" className="flex flex-wrap gap-2" role="group">
              {(["pending", "won", "lost"] as const).map((option) => (
                <button
                  aria-pressed={outcome === option}
                  className={cn(
                    "rounded-full px-3.5 py-[7px] font-mono text-xs font-medium uppercase tracking-[0.03em] transition-colors",
                    outcome === option
                      ? "bg-blue text-white"
                      : "border-[1.5px] border-line-strong text-ink-2 hover:bg-blue-soft",
                  )}
                  key={option}
                  onClick={() => {
                    setOutcome(option);
                    onOutcomeChange?.(option);
                    void saveSessionMeta({ outcome: option });
                  }}
                  type="button"
                >
                  {outcome === option ? "✓ " : ""}
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className={LABEL_CLS} htmlFor="deal-prep-debrief">
              Post-call debrief
            </label>
            <textarea
              className={cn(TEXTAREA_CLS, "min-h-[88px]")}
              id="deal-prep-debrief"
              onChange={(event) => setDebriefNotes(event.target.value)}
              placeholder="What landed? What surprised you?"
              rows={3}
              value={debriefNotes}
            />
            <button
              className="btn-secondary inline-flex items-center gap-2 self-start disabled:opacity-60"
              disabled={savingMeta}
              onClick={() => void saveSessionMeta({ debriefNotes })}
              type="button"
            >
              {savingMeta ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
              Save debrief
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

const SMALL_BTN_CLS =
  "inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-line-strong bg-white px-3 py-[5px] text-[13px] font-semibold text-ink-2 hover:border-ink hover:bg-blue-soft disabled:cursor-not-allowed disabled:opacity-60";

function HandoffBriefSection({
  title,
  label,
  items,
  bullet,
  tone = "blue",
}: {
  title: string;
  label: string;
  items: string[];
  bullet: string;
  tone?: "blue" | "danger";
}) {
  if (!items.length) return null;

  return (
    <section className={LINE_CARD_CLS}>
      <header className="flex items-baseline justify-between gap-3 border-b border-divider px-5 py-3.5">
        <h2 className={H2_CLS}>{title}</h2>
        <span className="label-mono shrink-0">
          {label} · {items.length}
        </span>
      </header>
      <ul className="divide-y divide-divider">
        {items.map((item) => (
          <li className="flex items-start gap-3 px-5 py-3" key={item}>
            <span
              aria-hidden
              className={cn("mt-[3px] shrink-0 font-mono text-xs", tone === "danger" ? "text-danger" : "text-blue")}
            >
              {bullet}
            </span>
            <span className="text-[15px] leading-[1.5] text-ink">{item}</span>
          </li>
        ))}
      </ul>
    </section>
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
  bullet = "▲",
  onPractice,
  activeObjection,
  accountName,
  industry,
  solutionFocus,
  prepSessionId,
}: {
  title?: string;
  items: string[];
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

  async function startObjectionPractice(objection: string) {
    await startDealPrepPractice(objection, practiceContext, onPractice);
  }

  return (
    <section className={LINE_CARD_CLS}>
      <header className="flex items-baseline justify-between gap-3 border-b border-divider px-5 py-3.5">
        <h2 className={H2_CLS}>{title}</h2>
        <span className="label-mono shrink-0">Handle · {items.length}</span>
      </header>
      <ul className="divide-y divide-divider">
        {items.map((item) => {
          const isActive = activeObjection === item;
          return (
            <li
              className={cn(
                "flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-start sm:justify-between",
                isActive && "bg-blue-soft",
              )}
              key={item}
            >
              <div className="flex items-start gap-3">
                <span aria-hidden className="mt-[3px] shrink-0 font-mono text-xs text-warning">
                  {bullet}
                </span>
                <span className="text-[15px] leading-[1.5] text-ink">{item}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {isActive ? <Tag tone="blue">● Practicing</Tag> : null}
                <button
                  aria-label={`Practice objection: ${item}`}
                  className={SMALL_BTN_CLS}
                  onClick={() => void startObjectionPractice(item)}
                  type="button"
                >
                  <Mic aria-hidden className="h-4 w-4" />
                  Practice
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function DealPrepBriefEmpty() {
  return (
    <div className="rounded-[14px] border-[1.5px] border-dashed border-line-strong p-7 text-center">
      <p className="text-lg font-extrabold text-ink">Your brief appears here</p>
      <p className="mx-auto mt-2 max-w-md text-[15px] leading-[1.5] text-muted">
        Fill in the account details and generate a brief. Discovery questions, likely objections and competitive
        positioning land here.
      </p>
    </div>
  );
}
