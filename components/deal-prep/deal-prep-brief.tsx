"use client";

import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  Copy,
  Download,
  Loader2,
  MessageSquareText,
  Mic,
  ShieldAlert,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import type { ComponentType, CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { SP_BLUE_BTN, SP_OUTLINE_BTN } from "@/components/se/sp-form-primitives";
import { BuyerSharePanel } from "@/components/buyer-shares/buyer-share-panel";
import type { DealPrepOutput } from "@/lib/ai/schemas";
import { formatPrepAsMarkdown } from "@/lib/deal-prep/export";
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
}: {
  result: DealPrepOutput;
  sessionId: string | null;
  sharedWithManager: boolean;
  debriefNotes: string;
  onRegenerate: (focus: string) => void;
  isRegenerating: boolean;
  onPracticeObjection: (objection: string) => void;
  activePracticeObjection: string | null;
}) {
  const brief = normalizeBrief(result);
  const [meetingMode, setMeetingMode] = useState(false);
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
    await navigator.clipboard.writeText(formatPrepAsMarkdown(brief, meetingMode));
    toast.success(meetingMode ? "Meeting brief copied." : "Full brief copied.");
  }

  function downloadMarkdown() {
    const blob = new Blob([formatPrepAsMarkdown(brief, meetingMode)], { type: "text/markdown" });
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

  return (
    <div className="overflow-hidden rounded-xl border border-[#e2eaf5] bg-white">
      <div className="space-y-3 border-b border-[#f1f5f9] p-[16px_18px]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[15px] font-bold text-[#0a1628]">{brief.accountName}</p>
            <p className="text-[12px] text-[#64748b]">{brief.executiveSummary}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className={meetingMode ? SP_BLUE_BTN : SP_OUTLINE_BTN}
              onClick={() => setMeetingMode((value) => !value)}
              type="button"
            >
              {meetingMode ? "Full brief" : "Meeting mode"}
            </button>
            <button className={SP_OUTLINE_BTN} onClick={() => void copyMarkdown()} type="button">
              <Copy className="h-4 w-4" />
              Copy
            </button>
            <button className={SP_OUTLINE_BTN} onClick={downloadMarkdown} type="button">
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {brief.oneThingToNail ? (
          <div className="rounded-xl border border-sp-magenta/20 bg-sp-magenta/5 px-4 py-3 text-sm">
            <span className="font-bold text-sp-navy">One thing to nail: </span>
            <span className="text-sp-navy-muted">{brief.oneThingToNail}</span>
          </div>
        ) : null}

        {!meetingMode ? (
          <div className="flex flex-wrap gap-2">
            {REGENERATE_FOCUS_OPTIONS.map((focus) => (
              <button
                className={cn(SP_OUTLINE_BTN, "rounded-full px-3 py-1 text-xs")}
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
        ) : null}
      </div>

      <div className="space-y-5 p-[16px_18px]">
        <BuyerSharePanel accountName={brief.accountName} prep={{ ...result, accountName: brief.accountName }} sessionId={sessionId} />
        {!meetingMode ? (
          <BriefSectionCard icon={Users} iconBg="#e8f2fc" iconColor="#0071ce" items={brief.stakeholderMap} title="Stakeholder map" />
        ) : null}
        <BriefSectionCard
          icon={MessageSquareText}
          iconBg="#e8f2fc"
          iconColor="#0071ce"
          items={meetingMode ? brief.discoveryQuestions.slice(0, 3) : brief.discoveryQuestions}
          title="Discovery questions"
        />
        <ObjectionSection
          accountName={brief.accountName}
          activeObjection={activePracticeObjection}
          industry={result.industry}
          items={meetingMode ? brief.likelyObjections.slice(0, 2) : brief.likelyObjections}
          onPractice={openPractice}
          prepSessionId={sessionId}
          solutionFocus={brief.solutions[0]}
        />
        {!meetingMode ? (
          <>
            <LandmineSection
              accountName={brief.accountName}
              industry={result.industry}
              items={brief.competitiveLandmines}
              onPractice={openPractice}
              prepSessionId={sessionId}
              solutionFocus={brief.solutions[0]}
            />
            <BriefSectionCard
              icon={Target}
              iconBg="#e8f2fc"
              iconColor="#0071ce"
              items={brief.proofPoints}
              title="Proof points to bring"
            />
            <BriefSectionCard icon={AlertTriangle} iconBg="#fef3c7" iconColor="#d97706" items={brief.riskFlags} title="Risk flags" />
            <BriefSectionCard
              icon={BookOpen}
              iconBg="#fdf0fa"
              iconColor="#a51e8e"
              items={brief.talkTrackOutline}
              title="Talk track outline"
            />
            {brief.linkedResources.length > 0 ? (
              <BriefSectionCard
                icon={BookOpen}
                iconBg="#e8f2fc"
                iconColor="#0071ce"
                items={brief.linkedResources}
                renderItem={(resource) => (
                  <button
                    className="font-semibold text-sp-blue hover:text-sp-blue-deep"
                    onClick={() => {
                      void fetch("/api/engagement", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          resourceLabel: resource,
                          accountName: brief.accountName,
                          eventType: "share",
                        }),
                      });
                      window.open(resolveResourceLink(resource), "_blank", "noopener,noreferrer");
                    }}
                    type="button"
                  >
                    {resource} →
                  </button>
                )}
                title="Recommended resources"
              />
            ) : null}
          </>
        ) : null}

        {sessionId ? (
          <div className="space-y-4 border-t border-sp-blue/10 pt-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-sp-navy">Share with manager</p>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-sp-navy-muted">
                <input
                  checked={shared}
                  onChange={(event) => {
                    const next = event.target.checked;
                    setShared(next);
                    void saveSessionMeta({ sharedWithManager: next });
                  }}
                  type="checkbox"
                />
                Let my manager review this brief
              </label>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-bold text-sp-navy">Post-call debrief</p>
              <Textarea
                onChange={(event) => setDebriefNotes(event.target.value)}
                placeholder="What landed? What surprised you? What would you change next time?"
                rows={4}
                value={debriefNotes}
              />
              <button
                className={cn(SP_OUTLINE_BTN, "mt-2")}
                disabled={savingMeta}
                onClick={() => void saveSessionMeta({ debriefNotes })}
                type="button"
              >
                {savingMeta ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save debrief
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function BriefSectionCard({
  title,
  items,
  icon: Icon,
  iconBg,
  iconColor,
  renderItem,
}: {
  title: string;
  items: string[];
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  iconBg: string;
  iconColor: string;
  renderItem?: (item: string) => ReactNode;
}) {
  if (!items?.length) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-[#e2eaf5] bg-white">
      <div className="flex items-center gap-[9px] border-b border-[#f1f5f9] p-[12px_16px]">
        <div className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[7px]" style={{ background: iconBg }}>
          <Icon className="h-3.5 w-3.5" style={{ color: iconColor }} />
        </div>
        <p className="text-[12px] font-bold text-[#0a1628]">{title}</p>
      </div>
      <div className="p-[12px_16px]">
        <ul className="space-y-[6px]">
        {items.map((item) => (
            <li className="flex items-start gap-[8px]" key={item}>
              <span className="mt-[1px] shrink-0 text-[11px] text-[#0071ce]">•</span>
              <span className="text-[12px] leading-[1.55] text-[#374151]">{renderItem ? renderItem(item) : item}</span>
            </li>
        ))}
      </ul>
      </div>
    </div>
  );
}

function LandmineSection({
  items,
  onPractice,
  accountName,
  industry,
  solutionFocus,
  prepSessionId,
}: {
  items: string[];
  onPractice: (landmine: string) => void;
  accountName: string;
  industry: string;
  solutionFocus?: string;
  prepSessionId: string | null;
}) {
  if (!items?.length) return null;

  async function startLandminePractice(landmine: string) {
    const response = await fetch("/api/deal-prep/practice-objection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        objection: landmine,
        accountName,
        industry,
        solutionFocus,
        prepSessionId: prepSessionId ?? undefined,
      }),
    });

    if (!response.ok) {
      onPractice(landmine);
      return;
    }

    const body = (await response.json()) as { redirectUrl: string };
    window.location.href = body.redirectUrl;
  }

  return (
    <BriefSectionCard
      icon={ShieldAlert}
      iconBg="#fef3c7"
      iconColor="#d97706"
      items={items}
      renderItem={(item) => (
        <span className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>{item}</span>
          <button className={SP_OUTLINE_BTN} onClick={() => void startLandminePractice(item)} type="button">
            <Mic className="h-4 w-4" />
            Practice
          </button>
        </span>
      )}
      title="Competitive landmines"
    />
  );
}

function ObjectionSection({
  items,
  onPractice,
  activeObjection,
  accountName,
  industry,
  solutionFocus,
  prepSessionId,
}: {
  items: string[];
  onPractice: (objection: string) => void;
  activeObjection: string | null;
  accountName: string;
  industry: string;
  solutionFocus?: string;
  prepSessionId: string | null;
}) {
  if (!items?.length) return null;

  async function startObjectionPractice(objection: string) {
    const response = await fetch("/api/deal-prep/practice-objection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        objection,
        accountName,
        industry,
        solutionFocus,
        prepSessionId: prepSessionId ?? undefined,
      }),
    });

    if (!response.ok) {
      onPractice(objection);
      return;
    }

    const body = (await response.json()) as { redirectUrl: string };
    window.location.href = body.redirectUrl;
  }

  return (
    <BriefSectionCard
      icon={MessageSquareText}
      iconBg="#e8f2fc"
      iconColor="#0071ce"
      items={items}
      renderItem={(item) => {
        const isActive = activeObjection === item;
        return (
          <span className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>{item}</span>
            <button
              className={isActive ? SP_BLUE_BTN : SP_OUTLINE_BTN}
              onClick={() => void startObjectionPractice(item)}
              type="button"
            >
              <Mic className="h-4 w-4" />
              {isActive ? "Practicing" : "Practice this"}
            </button>
          </span>
        );
      }}
      title="Likely objections"
    />
  );
}

export function DealPrepBriefEmpty() {
  return (
    <div className="rounded-xl border border-dashed border-[#e2eaf5] bg-white p-[18px]">
      <p className="flex items-center gap-2 text-[15px] font-bold text-[#0a1628]">
        <Sparkles className="h-5 w-5 text-sp-magenta" />
        Prep brief
      </p>
      <p className="mt-1 text-[12px] text-[#64748b]">Generate prep before your next customer call.</p>
    </div>
  );
}
