"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { CertReviewItem } from "@/components/manager/cert-review-item";
import {
  CoachingSignoffForm,
  ManagerCoachingBriefPanel,
  isSignoffReady,
  useCoachingSignoffState,
} from "@/components/manager/coaching-signoff-form";
import type { DealPrepReviewItem } from "@/components/manager/deal-prep-review-item";
import { ChallengeSubmissionReviewPanel } from "@/components/manager/challenge-submission-review-panel";
import type { PlanStepReviewItem } from "@/components/manager/plan-step-review-panel";
import type { ReviewItem } from "@/components/manager/review-queue";
import { SimulationCoachingReviewPanel } from "@/components/manager/simulation-coaching-review-panel";
import { HeaderStat } from "@/components/manager/team-member-bits";
import { ActionBar } from "@/components/ui/action-bar";
import { Chip } from "@/components/ui/chip";
import { Drawer } from "@/components/ui/drawer";
import { PageHeader } from "@/components/ui/page-header";
import type { ReviewSignoffContext } from "@/lib/coaching/signoff-policy";
import { signoffTierForReview } from "@/lib/coaching/signoff-policy";
import { INBOX_SLA_DAYS } from "@/lib/manager/team-status";
import { cn } from "@/lib/utils";

type MentorItem = {
  id: string;
  userId: string;
  topic: string;
  seNotes: string | null;
  seName?: string;
  createdAt?: string;
};

type PitchItem = {
  id: string;
  userId: string;
  title: string;
  personName: string;
  reflectionText: string | null;
  createdAt: string;
};

type InboxItem =
  | ({ inboxType: "submission" } & Extract<ReviewItem, { kind: "submission" }>)
  | ({ inboxType: "coaching" } & Extract<ReviewItem, { kind: "coaching" }>)
  | ({ inboxType: "plan_step" } & PlanStepReviewItem)
  | ({ inboxType: "mentor" } & MentorItem)
  | ({ inboxType: "cert" } & CertReviewItem)
  | ({ inboxType: "deal_prep" } & DealPrepReviewItem)
  | ({ inboxType: "pitch" } & PitchItem);

type InboxType = InboxItem["inboxType"];
type Filter = "all" | InboxType;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "submission", label: "Challenges" },
  { id: "coaching", label: "Sims" },
  { id: "plan_step", label: "Steps" },
  { id: "cert", label: "Gates" },
  { id: "mentor", label: "Mentor notes" },
  { id: "deal_prep", label: "Deal preps" },
  { id: "pitch", label: "Pitches" },
];

const TYPE_LABEL: Record<InboxType, string> = {
  submission: "Challenge",
  coaching: "Sim card",
  plan_step: "Plan step",
  cert: "Cert gate",
  mentor: "Mentor note",
  deal_prep: "Deal prep",
  pitch: "Pitch",
};

/** Sim cards at or above this score can be approved in bulk. */
const BULK_MIN_SCORE = 75;

const GRID = "grid grid-cols-[36px_76px_120px_minmax(0,1fr)_150px_60px_90px] gap-3";

function itemKey(item: InboxItem) {
  if (item.inboxType === "plan_step") return `plan-${item.assignmentStepId}`;
  return `${item.inboxType}-${item.id}`;
}

function itemTitle(item: InboxItem) {
  if (item.inboxType === "mentor") return item.topic;
  if (item.inboxType === "cert") return item.label;
  if (item.inboxType === "deal_prep") return `${item.accountName} · ${item.industry}`;
  return item.title;
}

function itemPerson(item: InboxItem) {
  if (item.inboxType === "mentor") return item.seName ?? "Team member";
  return item.personName;
}

function itemTimestamp(item: InboxItem): string | null {
  switch (item.inboxType) {
    case "submission":
    case "coaching":
      return item.submittedAt ?? null;
    case "deal_prep":
    case "pitch":
      return item.createdAt;
    case "mentor":
      return item.createdAt ?? null;
    case "cert":
      return item.submittedAt;
    default:
      return null;
  }
}

function isBulkEligible(item: InboxItem) {
  return item.inboxType === "coaching" && item.score >= BULK_MIN_SCORE;
}

function typeTagLabel(item: InboxItem) {
  if (item.inboxType === "plan_step" && item.isManagerGate) return "◆ Gate step";
  return TYPE_LABEL[item.inboxType];
}

function usesStructuredSignoff(item: InboxItem) {
  return item.inboxType !== "mentor";
}

function signoffContextForItem(item: InboxItem): ReviewSignoffContext {
  switch (item.inboxType) {
    case "coaching":
      return { reviewType: "coaching_card" };
    case "submission":
      return { reviewType: "challenge_submission" };
    case "plan_step":
      return { reviewType: "plan_step", isManagerGate: item.isManagerGate };
    case "cert":
      return { reviewType: "certification", isManagerGate: true };
    case "deal_prep":
      return { reviewType: "deal_prep" };
    case "pitch":
      return { reviewType: "pitch" };
    default:
      return { reviewType: "mentor_review" };
  }
}

/** Type-specific helper text: the button is always "Approve"; this says what approving does. */
function helperText(item: InboxItem) {
  const first = itemPerson(item).split(" ")[0];
  switch (item.inboxType) {
    case "coaching":
      return `Approving signs off this coaching card and validates ${first}'s simulation step.`;
    case "submission":
      return `Approving marks the challenge reviewed and records your grade for ${first}.`;
    case "plan_step":
      return item.isManagerGate
        ? `This step is a segment gate. Approving validates it and unlocks ${first}'s next segment.`
        : `Approving validates this step in ${first}'s ramp${item.mentorEndorsed ? " (already endorsed by their mentor)" : ""}.`;
    case "cert":
      return `Approving clears the ${item.label} gate for ${first}.`;
    case "deal_prep":
      return `Approving records your sign-off on ${first}'s deal prep brief.`;
    case "pitch":
      return `Approving marks the pitch reviewed with your grade.`;
    default:
      return `Approving sends your feedback to ${first}.`;
  }
}

function briefPayloadForItem(item: InboxItem) {
  return {
    reviewType: signoffContextForItem(item).reviewType,
    personName: itemPerson(item),
    title: itemTitle(item),
    strengths: item.inboxType === "coaching" ? item.strengths : undefined,
    gaps: item.inboxType === "coaching" ? item.gaps : undefined,
    managerSummary: item.inboxType === "coaching" ? item.managerSummary : undefined,
    recommendedImprovements: item.inboxType === "coaching" ? item.recommendedImprovements : undefined,
    isManagerGate: item.inboxType === "plan_step" ? item.isManagerGate : item.inboxType === "cert",
    context:
      item.inboxType === "submission"
        ? [`Challenge submission for ${item.personName}`, item.reflectionText ? `SE reflection: ${item.reflectionText}` : null]
            .filter(Boolean)
            .join("\n")
        : item.inboxType === "plan_step"
          ? `Plan step: ${item.stepType}${item.mentorEndorsed ? " (mentor endorsed)" : ""}`
          : undefined,
  };
}

function ageDays(iso: string | null, now: number): number | null {
  if (!iso) return null;
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return null;
  return Math.max(0, Math.floor((now - time) / 86_400_000));
}

function ageLabel(iso: string | null, now: number) {
  if (!iso) return "—";
  const time = new Date(iso).getTime();
  if (now - time < 3_600_000) return "Now";
  const days = ageDays(iso, now) ?? 0;
  return days === 0 ? "Today" : `${days}d`;
}

function gradeFromScore(score: number) {
  return Math.max(1, Math.min(5, Math.round(score / 20)));
}

async function sendReview(
  item: InboxItem,
  decision: "approve" | "reject",
  coachingSignoff: unknown,
  grade: number,
  feedback: string,
): Promise<Response> {
  const json = (url: string, body: unknown) =>
    fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  switch (item.inboxType) {
    case "submission":
      return json(`/api/reviews/submissions/${item.id}`, { managerGrade: grade, decision, coachingSignoff });
    case "coaching":
      return json(`/api/reviews/coaching-cards/${item.id}`, { managerGrade: grade, decision, coachingSignoff });
    case "plan_step":
      return json(`/api/plans/steps/${item.assignmentStepId}/review`, { decision, coachingSignoff });
    case "cert":
      return json(`/api/certifications/${item.id}`, {
        status: decision === "approve" ? "approved" : "revoked",
        coachingSignoff,
      });
    case "deal_prep":
      return json(`/api/deal-prep/sessions/${item.id}`, { coachingSignoff });
    case "pitch":
      return json(`/api/pitch/submissions/${item.id}`, {
        status: decision === "approve" ? "reviewed" : "rejected",
        managerGrade: decision === "approve" ? grade : undefined,
        coachingSignoff,
      });
    default:
      return json("/api/mentor-reviews", { id: item.id, mentorFeedback: feedback, decision });
  }
}

/** Manager › Inbox: oldest first, type filters, bulk approve for strong sim cards, and one review drawer. */
export function ManagerInbox({
  reviewItems,
  planSteps,
  certItems = [],
  dealPrepItems = [],
}: {
  reviewItems: ReviewItem[];
  planSteps: PlanStepReviewItem[];
  certItems?: CertReviewItem[];
  dealPrepItems?: DealPrepReviewItem[];
}) {
  const router = useRouter();
  const [now] = useState(() => Date.now());
  const [mentorItems, setMentorItems] = useState<MentorItem[]>([]);
  const [pitchItems, setPitchItems] = useState<PitchItem[]>([]);
  const [extrasLoading, setExtrasLoading] = useState(2);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [grade, setGrade] = useState("4");
  const [saving, setSaving] = useState<"approve" | "reject" | "bulk" | null>(null);
  const signoff = useCoachingSignoffState();

  useEffect(() => {
    void fetch("/api/mentor-reviews")
      .then((response) => (response.ok ? response.json() : { requests: [] }))
      .then((body: { requests?: Array<MentorItem & { status: string }> }) =>
        setMentorItems((body.requests ?? []).filter((item) => item.status === "pending")),
      )
      .catch(() => undefined)
      .finally(() => setExtrasLoading((count) => count - 1));
    void fetch("/api/pitch/submissions/pending")
      .then((response) => (response.ok ? response.json() : { pitches: [] }))
      .then((body: { pitches?: PitchItem[] }) => setPitchItems(body.pitches ?? []))
      .catch(() => undefined)
      .finally(() => setExtrasLoading((count) => count - 1));
  }, []);

  const allItems = useMemo(() => {
    const items: InboxItem[] = [
      ...reviewItems.map((item) =>
        item.kind === "submission"
          ? ({ inboxType: "submission" as const, ...item } as InboxItem)
          : ({ inboxType: "coaching" as const, ...item } as InboxItem),
      ),
      ...planSteps.map((item) => ({ inboxType: "plan_step" as const, ...item })),
      ...certItems.map((item) => ({ inboxType: "cert" as const, ...item })),
      ...dealPrepItems.map((item) => ({ inboxType: "deal_prep" as const, ...item })),
      ...pitchItems.map((item) => ({ inboxType: "pitch" as const, ...item })),
      ...mentorItems.map((item) => ({ inboxType: "mentor" as const, ...item })),
    ];
    // Oldest first; items without a timestamp go last.
    return items
      .filter((item) => !removed.has(itemKey(item)))
      .map((item, index) => ({ item, index, time: itemTimestamp(item) }))
      .sort((a, b) => {
        const at = a.time ? new Date(a.time).getTime() : Number.POSITIVE_INFINITY;
        const bt = b.time ? new Date(b.time).getTime() : Number.POSITIVE_INFINITY;
        return at === bt ? a.index - b.index : at - bt;
      })
      .map(({ item }) => item);
  }, [reviewItems, planSteps, certItems, dealPrepItems, pitchItems, mentorItems, removed]);

  const counts = useMemo(() => {
    const result: Record<Filter, number> = {
      all: allItems.length,
      submission: 0,
      coaching: 0,
      plan_step: 0,
      cert: 0,
      mentor: 0,
      deal_prep: 0,
      pitch: 0,
    };
    for (const item of allItems) result[item.inboxType] += 1;
    return result;
  }, [allItems]);

  const visible = filter === "all" ? allItems : allItems.filter((item) => item.inboxType === filter);
  const overSla = allItems.filter((item) => (ageDays(itemTimestamp(item), now) ?? 0) > INBOX_SLA_DAYS).length;
  const activeItem = activeKey ? (allItems.find((item) => itemKey(item) === activeKey) ?? null) : null;
  const selectedItems = allItems.filter((item) => selected.has(itemKey(item)));
  const eligibleVisible = visible.filter(isBulkEligible);
  const allEligibleSelected = eligibleVisible.length > 0 && eligibleVisible.every((item) => selected.has(itemKey(item)));

  useEffect(() => {
    if (!activeKey) return;
    signoff.setStrength("");
    signoff.setGap("");
    signoff.setNextAction("");
    signoff.setConfidence(null);
    signoff.setLiveAttestation(false);
    signoff.setAttestationNote("");
    signoff.setOpenedAt(new Date().toISOString());
    setFeedback("");
    setGrade("4");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  const closeReview = useCallback(() => setActiveKey(null), []);

  function removeItems(keys: string[]) {
    setRemoved((current) => new Set([...current, ...keys]));
    setSelected((current) => new Set([...current].filter((key) => !keys.includes(key))));
  }

  function toggleSelect(item: InboxItem) {
    if (!isBulkEligible(item)) {
      toast(`Only sim cards at ${BULK_MIN_SCORE}+ can be bulk approved`);
      return;
    }
    const key = itemKey(item);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAllEligible() {
    if (eligibleVisible.length === 0) {
      toast(`Only sim cards at ${BULK_MIN_SCORE}+ can be bulk approved`);
      return;
    }
    setSelected((current) => {
      const next = new Set(current);
      for (const item of eligibleVisible) {
        if (allEligibleSelected) next.delete(itemKey(item));
        else next.add(itemKey(item));
      }
      return next;
    });
  }

  async function submitReview(item: InboxItem, decision: "approve" | "reject") {
    if (usesStructuredSignoff(item)) {
      if (!isSignoffReady(signoffTierForReview(signoffContextForItem(item)), signoff.value, decision)) {
        toast.error(
          decision === "approve"
            ? "Complete the coaching sign-off fields before approving."
            : "Add guidance before requesting changes.",
        );
        return;
      }
    } else if (feedback.trim().length < 3) {
      toast.error("Add feedback first.");
      return;
    }

    setSaving(decision);
    const response = await sendReview(item, decision, signoff.value, Number(grade), feedback).catch(() => null);
    setSaving(null);

    if (!response?.ok) {
      const body = (await response?.json().catch(() => null)) as { error?: string } | null;
      toast.error(body?.error ?? "Review failed.");
      return;
    }

    removeItems([itemKey(item)]);
    setActiveKey(null);
    const first = itemPerson(item).split(" ")[0];
    toast.success(decision === "approve" ? `Approved · ${first} notified` : `Changes requested · ${first} notified`);
    router.refresh();
  }

  async function bulkApprove() {
    const items = selectedItems.filter(isBulkEligible);
    if (items.length === 0) return;
    setSaving("bulk");
    const openedAt = new Date().toISOString();
    const results = await Promise.all(
      items.map(async (item) => {
        if (item.inboxType !== "coaching") return { item, ok: false };
        // Bulk sign-off reuses the card's own coaching points; the server still validates it.
        const coachingSignoff = {
          strength: item.strengths[0] ?? "",
          gap: item.gaps[0] ?? "",
          nextAction: item.recommendedImprovements[0] ?? item.gaps[1] ?? "",
          openedAt,
        };
        const response = await sendReview(item, "approve", coachingSignoff, gradeFromScore(item.score), "").catch(
          () => null,
        );
        return { item, ok: Boolean(response?.ok) };
      }),
    );
    setSaving(null);
    const approved = results.filter((result) => result.ok);
    const failed = results.length - approved.length;
    removeItems(approved.map((result) => itemKey(result.item)));
    if (approved.length > 0) {
      toast.success(
        failed > 0
          ? `Approved ${approved.length} · ${failed} need a full review`
          : approved.length === 1
            ? `Approved · ${itemPerson(approved[0]!.item).split(" ")[0]} notified`
            : `Approved ${approved.length} items`,
      );
      router.refresh();
    } else {
      toast.error("Those cards need a full review. Open each one to add your sign-off.");
    }
  }

  const tier = activeItem ? signoffTierForReview(signoffContextForItem(activeItem)) : "light";
  const appendMoment = (moment: string) => {
    const current = signoff.value.nextAction;
    signoff.setNextAction(current.trim() ? `${current.trim()}\n\n• ${moment}` : moment);
  };

  return (
    <>
      <PageHeader
        actions={
          <div className="flex gap-8">
            <HeaderStat label="Waiting" value={allItems.length} />
            <HeaderStat label="Over 3 days" tone={overSla > 0 ? "danger" : "blue"} value={overSla} />
          </div>
        }
        className="pb-4"
        eyebrow="Oldest first"
        title="Inbox"
      />

      <div className="flex flex-wrap gap-1.5 px-[var(--gutter)] pb-3" role="group" aria-label="Filter by type">
        {FILTERS.filter((option) => option.id === "all" || counts[option.id] > 0).map((option) => (
          <Chip active={filter === option.id} key={option.id} onClick={() => setFilter(option.id)}>
            {option.label} {counts[option.id]}
          </Chip>
        ))}
      </div>

      <div className="px-[var(--gutter)] pb-8">
        <div className="overflow-hidden rounded-[14px] border border-line bg-white">
          <div className="overflow-x-auto">
            <div aria-label="Items waiting on you" className="min-w-[760px]" role="table">
              <div
                className={cn(GRID, "items-center bg-blue px-[18px] py-[11px] font-mono text-xs text-white uppercase")}
                role="row"
              >
                <span role="columnheader">
                  <button
                    aria-checked={allEligibleSelected}
                    aria-label={`Select all sim cards at ${BULK_MIN_SCORE}+`}
                    className={cn(
                      "grid h-[18px] w-[18px] place-items-center rounded-[5px] border-[1.5px] border-white text-xs",
                      allEligibleSelected && "bg-white text-blue",
                    )}
                    onClick={toggleAllEligible}
                    role="checkbox"
                    type="button"
                  >
                    {allEligibleSelected ? "✓" : null}
                  </button>
                </span>
                <span role="columnheader">Age</span>
                <span role="columnheader">Type</span>
                <span role="columnheader">Item</span>
                <span role="columnheader">SE</span>
                <span role="columnheader">Score</span>
                <span role="columnheader">
                  <span className="sr-only">Action</span>
                </span>
              </div>

              {visible.map((item) => {
                const key = itemKey(item);
                const on = selected.has(key);
                const eligible = isBulkEligible(item);
                const time = itemTimestamp(item);
                const days = ageDays(time, now);
                const old = days !== null && days > INBOX_SLA_DAYS;
                const fresh = time ? now - new Date(time).getTime() < 3_600_000 : false;
                return (
                  <div
                    className={cn(
                      GRID,
                      "items-center border-b border-divider px-[18px] py-3 text-[15px] last:border-b-0",
                      on ? "bg-blue-soft" : fresh ? "bg-signal-soft" : null,
                    )}
                    key={key}
                    role="row"
                  >
                    <span role="cell">
                      <button
                        aria-checked={on}
                        aria-disabled={!eligible}
                        aria-label={`Select ${itemTitle(item)} for bulk approve`}
                        className={cn(
                          "grid h-[18px] w-[18px] place-items-center rounded-[5px] text-xs text-white",
                          on
                            ? "bg-blue"
                            : eligible
                              ? "border-[1.5px] border-faint"
                              : "cursor-not-allowed border-[1.5px] border-line",
                        )}
                        onClick={() => toggleSelect(item)}
                        role="checkbox"
                        type="button"
                      >
                        {on ? "✓" : null}
                      </button>
                    </span>
                    <span role="cell" suppressHydrationWarning>
                      <span
                        className={cn(
                          "font-mono text-xs font-medium uppercase",
                          old ? "rounded-[6px] bg-danger px-2 py-[3px] text-white" : "text-ink-2",
                        )}
                        suppressHydrationWarning
                      >
                        {ageLabel(time, now)}
                      </span>
                    </span>
                    <span role="cell">
                      <span className="inline-flex rounded-full border-[1.5px] border-line-strong px-[9px] py-0.5 font-mono text-xs whitespace-nowrap text-ink-2 uppercase">
                        {typeTagLabel(item)}
                      </span>
                    </span>
                    <span className="min-w-0 truncate font-bold text-ink" role="cell">
                      {itemTitle(item)}
                    </span>
                    <span className="truncate text-ink" role="cell">
                      {itemPerson(item)}
                    </span>
                    <span className="text-xl font-extrabold tracking-[-0.03em] text-ink" role="cell">
                      {item.inboxType === "coaching" ? item.score : "—"}
                    </span>
                    <span className="text-right" role="cell">
                      <button className="link text-sm" onClick={() => setActiveKey(key)} type="button">
                        Review<span className="sr-only"> {itemTitle(item)}</span>
                      </button>
                    </span>
                  </div>
                );
              })}

              {visible.length === 0 && extrasLoading === 0 ? (
                <p className="px-10 py-10 text-center text-base text-muted">Inbox clear. Nice work.</p>
              ) : null}
              {extrasLoading > 0 ? (
                <p aria-live="polite" className="px-[18px] py-3 label-mono" role="status">
                  Loading mentor notes and pitches…
                </p>
              ) : null}
            </div>
          </div>
        </div>
        {counts.coaching > 0 ? (
          <p className="mt-3 text-[13px] text-muted">
            Tick sim cards scoring {BULK_MIN_SCORE}+ to approve them together. Everything else opens for a full review.
          </p>
        ) : null}
      </div>

      {selectedItems.length > 0 ? (
        <ActionBar
          count={`${selectedItems.length} selected`}
          primary={
            <button className="btn-primary" disabled={saving === "bulk"} onClick={() => void bulkApprove()} type="button">
              {saving === "bulk" ? "Approving…" : `Approve ${selectedItems.length}`}
            </button>
          }
          secondary={
            <button
              className="text-sm font-bold text-white underline decoration-2 underline-offset-[3px]"
              onClick={() => setSelected(new Set())}
              type="button"
            >
              Clear
            </button>
          }
          summary={`Bulk approve · sim cards ${BULK_MIN_SCORE}+ only`}
        />
      ) : null}

      <Drawer
        footer={
          activeItem ? (
            <div className="flex items-center gap-3.5">
              <button
                className="btn-primary"
                disabled={saving !== null}
                onClick={() => void submitReview(activeItem, "approve")}
                type="button"
              >
                {saving === "approve" ? "Approving…" : "Approve"}
              </button>
              <button
                className="btn-secondary disabled:opacity-60"
                disabled={saving !== null}
                onClick={() => void submitReview(activeItem, "reject")}
                type="button"
              >
                {saving === "reject" ? "Sending…" : "Request changes"}
              </button>
            </div>
          ) : null
        }
        onClose={closeReview}
        open={activeItem !== null}
        title={
          activeItem ? (
            <span className="flex flex-col gap-1.5">
              <span className="label-mono" suppressHydrationWarning>
                {typeTagLabel(activeItem)} · {itemPerson(activeItem)}
                {itemTimestamp(activeItem) ? ` · ${ageLabel(itemTimestamp(activeItem), now)}` : ""}
              </span>
              <span className="text-[22px] leading-[1.15] font-extrabold tracking-[-0.015em] text-ink">
                {itemTitle(activeItem)}
              </span>
            </span>
          ) : (
            "Review"
          )
        }
      >
        {activeItem ? (
          <div className="flex flex-col gap-4 text-[15px] leading-normal text-ink-2">
            <p>{helperText(activeItem)}</p>

            {activeItem.inboxType === "coaching" ? (
              <SimulationCoachingReviewPanel
                item={{
                  score: activeItem.score,
                  title: activeItem.title,
                  personName: activeItem.personName,
                  strengths: activeItem.strengths,
                  gaps: activeItem.gaps,
                  recommendedImprovements: activeItem.recommendedImprovements,
                  managerSummary: activeItem.managerSummary,
                  seReflection: activeItem.seReflection,
                  simulationLabel: activeItem.simulationLabel,
                  transcript: activeItem.transcript,
                }}
                onAppendMoment={appendMoment}
                onDraft={(text) => signoff.setNextAction(text)}
              />
            ) : null}

            {activeItem.inboxType === "submission" ? (
              <ChallengeSubmissionReviewPanel
                challengeTitle={activeItem.title}
                onAppendMoment={appendMoment}
                onDraft={(text) => signoff.setNextAction(text)}
                onSuggestedGrade={(suggested) => setGrade(String(suggested))}
                submissionId={activeItem.id}
              />
            ) : null}

            {activeItem.inboxType === "mentor" && activeItem.seNotes ? (
              <div className="rounded-[14px] bg-blue-soft px-4 py-3">
                <p className="label-mono">SE notes</p>
                <p className="mt-1 text-ink">{activeItem.seNotes}</p>
              </div>
            ) : null}

            {activeItem.inboxType === "pitch" && activeItem.reflectionText ? (
              <div className="rounded-[14px] bg-blue-soft px-4 py-3">
                <p className="label-mono">SE reflection</p>
                <p className="mt-1 text-ink">{activeItem.reflectionText}</p>
              </div>
            ) : null}

            {activeItem.inboxType === "pitch" ? (
              <Link className="link self-start text-sm" href={`/pitch?review=${activeItem.id}`} target="_blank">
                Watch video pitch
              </Link>
            ) : null}

            {usesStructuredSignoff(activeItem) ? (
              <>
                <ManagerCoachingBriefPanel onBrief={signoff.applyBrief} payload={briefPayloadForItem(activeItem)} />
                <CoachingSignoffForm
                  decision="approve"
                  onAttestationNoteChange={signoff.setAttestationNote}
                  onConfidenceChange={signoff.setConfidence}
                  onGapChange={signoff.setGap}
                  onLiveAttestationChange={signoff.setLiveAttestation}
                  onNextActionChange={signoff.setNextAction}
                  onStrengthChange={signoff.setStrength}
                  signoff={signoff.value}
                  tier={tier}
                />
              </>
            ) : (
              <label className="flex flex-col gap-1.5 text-sm font-bold text-ink">
                Feedback
                <textarea
                  className="h-24 w-full resize-none rounded-[10px] border-[1.5px] border-line-strong px-3 py-2.5 text-sm font-normal text-ink"
                  onChange={(event) => setFeedback(event.target.value)}
                  placeholder="What worked, and what to improve"
                  value={feedback}
                />
              </label>
            )}

            {activeItem.inboxType === "submission" ||
            activeItem.inboxType === "coaching" ||
            activeItem.inboxType === "pitch" ? (
              <label className="flex flex-col gap-1.5 text-sm font-bold text-ink">
                Grade (1–5)
                <input
                  className="w-24 rounded-[10px] border-[1.5px] border-line-strong px-3 py-2 text-sm font-normal text-ink"
                  max={5}
                  min={1}
                  onChange={(event) => setGrade(event.target.value)}
                  type="number"
                  value={grade}
                />
              </label>
            ) : null}
          </div>
        ) : null}
      </Drawer>
    </>
  );
}
