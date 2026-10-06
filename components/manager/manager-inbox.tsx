"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Chip } from "@/components/ui/chip";
import { Modal } from "@/components/ui/modal";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { FilterBar, TableCard, rowHighlight, tdCls, thCls } from "@/components/ui/table";
import type { ReviewSignoffContext } from "@/lib/coaching/signoff-policy";
import { signoffTierForReview } from "@/lib/coaching/signoff-policy";
import { ageWords } from "@/lib/manager/copy";
import { AT_RISK_READINESS, INBOX_SLA_DAYS } from "@/lib/manager/team-status";
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
  { id: "coaching", label: "Sim cards" },
  { id: "submission", label: "Challenges" },
  { id: "plan_step", label: "Plan steps" },
  { id: "cert", label: "Gates" },
  { id: "mentor", label: "Mentor notes" },
  { id: "deal_prep", label: "Deal preps" },
  { id: "pitch", label: "Pitches" },
];

const TYPE_LABEL: Record<InboxType, string> = {
  submission: "Challenge",
  coaching: "Sim card",
  plan_step: "Plan step",
  cert: "Gate",
  mentor: "Mentor note",
  deal_prep: "Deal prep",
  pitch: "Pitch",
};

/** Sim cards at or above this score can be approved in bulk. */
const BULK_MIN_SCORE = 75;

type AgeFilter = "any" | "old" | "today";

function itemKey(item: InboxItem) {
  if (item.inboxType === "plan_step") return `plan-${item.assignmentStepId}`;
  return `${item.inboxType}-${item.id}`;
}

function itemTitle(item: InboxItem) {
  if (item.inboxType === "mentor") return item.topic;
  if (item.inboxType === "cert") return item.label;
  if (item.inboxType === "deal_prep") return `${item.accountName}, ${item.industry}`;
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
  if (item.inboxType === "plan_step" && item.isManagerGate) return "Gate step";
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
  if (!iso) return "Not dated";
  const time = new Date(iso).getTime();
  if (now - time < 3_600_000) return "Just now";
  return ageWords(ageDays(iso, now));
}

/** ", waiting 4 days" or ", submitted today" for the review drawer subline. */
function waitingPhrase(iso: string | null, now: number) {
  if (!iso) return "";
  const days = ageDays(iso, now);
  return days && days > 0 ? `, waiting ${ageWords(days)}` : ", submitted today";
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
  const [personFilter, setPersonFilter] = useState("all");
  const [ageFilter, setAgeFilter] = useState<AgeFilter>("any");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [grade, setGrade] = useState("4");
  const [saving, setSaving] = useState<"approve" | "reject" | "bulk" | null>(null);
  const signoff = useCoachingSignoffState();
  const workbenchTitleId = useId();
  const [attemptedKey, setAttemptedKey] = useState<string | null>(null);

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
      all: 0,
      submission: 0,
      coaching: 0,
      plan_step: 0,
      cert: 0,
      mentor: 0,
      deal_prep: 0,
      pitch: 0,
    };
    for (const item of allItems) {
      if (personFilter !== "all" && itemPerson(item) !== personFilter) continue;
      if (ageFilter !== "any") {
        const days = ageDays(itemTimestamp(item), now);
        if (ageFilter === "old" ? !(days !== null && days > INBOX_SLA_DAYS) : days !== 0) continue;
      }
      result[item.inboxType] += 1;
      result.all += 1;
    }
    return result;
  }, [allItems, personFilter, ageFilter, now]);

  const people = useMemo(() => [...new Set(allItems.map(itemPerson))].sort((a, b) => a.localeCompare(b)), [allItems]);
  // Person and age narrow the list first; the type chips count what is left.
  const narrowed = allItems.filter((item) => {
    if (personFilter !== "all" && itemPerson(item) !== personFilter) return false;
    if (ageFilter === "any") return true;
    const days = ageDays(itemTimestamp(item), now);
    return ageFilter === "old" ? days !== null && days > INBOX_SLA_DAYS : days === 0;
  });
  const visible = filter === "all" ? narrowed : narrowed.filter((item) => item.inboxType === filter);
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
      toast(`Only sim cards scoring ${BULK_MIN_SCORE} or higher can be approved in bulk. Open this one to review it.`);
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
      toast(`Only sim cards scoring ${BULK_MIN_SCORE} or higher can be approved in bulk.`);
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
        setAttemptedKey(itemKey(item));
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
    toast.success(decision === "approve" ? `Approved. ${first} has been notified.` : `Changes requested. ${first} has been notified.`);
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
          ? `Approved ${approved.length}. ${failed} still need a full review.`
          : approved.length === 1
            ? `Approved. ${itemPerson(approved[0]!.item).split(" ")[0]} has been notified.`
            : `Approved ${approved.length} sim cards.`,
      );
      router.refresh();
    } else {
      toast.error("Those cards need a full review. Open each one to add your sign-off.");
    }
  }

  const tier = activeItem ? signoffTierForReview(signoffContextForItem(activeItem)) : "light";
  const appendMoment = (moment: string) => {
    const current = signoff.value.nextAction;
    signoff.setNextAction(current.trim() ? `${current.trim()}\n\n${moment}` : moment);
  };

  const pillCls =
    "cursor-pointer appearance-none rounded-full border border-line bg-white bg-[length:8px] bg-[right_14px_center] bg-no-repeat py-[7px] pr-9 pl-3.5 text-sm font-semibold text-ink hover:border-line-strong";
  const caret = {
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 5'%3E%3Cpath d='M1 1l3 3 3-3' fill='none' stroke='%23121A2E' stroke-width='1.5'/%3E%3C/svg%3E\")",
  };

  return (
    <>
      <PageHeader
        accent="Oldest first."
        actions={
          <div className="flex items-end gap-9">
            <HeaderStat label="Waiting" value={allItems.length} />
            <HeaderStat label="Older than 3 days" tone={overSla > 0 ? "danger" : "blue"} value={overSla} />
          </div>
        }
        className="pb-[22px]"
        eyebrow="Manager"
        title="Inbox."
      />

      <PageBody className="flex flex-col gap-[22px] pb-8">
        <FilterBar
          show={
            <span aria-label="Filter by type" className="flex flex-wrap gap-2" role="group">
              {FILTERS.filter((option) => option.id === "all" || counts[option.id] > 0).map((option) => (
                <Chip
                  active={filter === option.id}
                  count={counts[option.id]}
                  key={option.id}
                  onClick={() => setFilter(option.id)}
                >
                  {option.label}
                </Chip>
              ))}
            </span>
          }
        >
          <select
            aria-label="Filter by SE"
            className={pillCls}
            onChange={(event) => setPersonFilter(event.target.value)}
            style={caret}
            value={personFilter}
          >
            <option value="all">Every SE</option>
            {people.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by age"
            className={pillCls}
            onChange={(event) => setAgeFilter(event.target.value as AgeFilter)}
            style={caret}
            value={ageFilter}
          >
            <option value="any">Any age</option>
            <option value="old">Older than {INBOX_SLA_DAYS} days</option>
            <option value="today">Today</option>
          </select>
        </FilterBar>

        <div className="flex flex-col gap-3">
          <TableCard>
            <caption className="sr-only">Items waiting on you, oldest first</caption>
            <thead>
              <tr>
                <th className={cn(thCls, "w-[52px]")} scope="col">
                  <Checkbox
                    checked={allEligibleSelected}
                    label={`Select every sim card scoring ${BULK_MIN_SCORE} or higher`}
                    onChange={toggleAllEligible}
                  />
                </th>
                <th className={cn(thCls, "w-[100px]")} scope="col">
                  Age
                </th>
                <th className={cn(thCls, "w-[120px]")} scope="col">
                  Type
                </th>
                <th className={thCls} scope="col">
                  Item
                </th>
                <th className={cn(thCls, "w-[160px]")} scope="col">
                  SE
                </th>
                <th className={cn(thCls, "w-[76px]")} scope="col">
                  Score
                </th>
                <th className={cn(thCls, "w-[96px]")} scope="col">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => {
                const key = itemKey(item);
                const on = selected.has(key);
                const eligible = isBulkEligible(item);
                const time = itemTimestamp(item);
                const days = ageDays(time, now);
                const old = days !== null && days > INBOX_SLA_DAYS;
                const fresh = time ? now - new Date(time).getTime() < 3_600_000 : false;
                const score = item.inboxType === "coaching" ? item.score : null;
                return (
                  <tr
                    className={cn(
                      "cursor-pointer",
                      on ? rowHighlight.selected : fresh ? rowHighlight.ready : "hover:bg-[#FBF9F5]",
                    )}
                    key={key}
                    onClick={(event) => {
                      // The whole row opens the workbench; the checkbox and buttons keep their own clicks.
                      if ((event.target as HTMLElement).closest("button, a, input, label")) return;
                      setActiveKey(key);
                    }}
                  >
                    <td className={cn(tdCls, "py-3")}>
                      <Checkbox
                        aria-disabled={!eligible}
                        checked={on}
                        className={eligible ? undefined : "opacity-50"}
                        label={
                          eligible
                            ? `Select ${itemTitle(item)} for bulk approve`
                            : `${itemTitle(item)} needs a full review`
                        }
                        onChange={() => toggleSelect(item)}
                      />
                    </td>
                    <td className={cn(tdCls, "py-3")} suppressHydrationWarning>
                      {old ? (
                        <span
                          className="inline-flex rounded-full bg-danger-soft px-2.5 py-[3px] text-[13px] font-bold whitespace-nowrap text-danger"
                          suppressHydrationWarning
                        >
                          {ageLabel(time, now)}
                        </span>
                      ) : (
                        <span className="text-sm whitespace-nowrap text-muted" suppressHydrationWarning>
                          {ageLabel(time, now)}
                        </span>
                      )}
                    </td>
                    <td className={cn(tdCls, "py-3 text-sm whitespace-nowrap text-ink-2")}>{typeTagLabel(item)}</td>
                    <td className={cn(tdCls, "max-w-0 py-3")}>
                      <button
                        className="block max-w-full cursor-pointer truncate text-left font-bold text-ink decoration-blue decoration-2 underline-offset-4 hover:text-blue hover:underline focus-visible:text-blue focus-visible:underline"
                        onClick={() => setActiveKey(key)}
                        type="button"
                      >
                        {itemTitle(item)}
                      </button>
                    </td>
                    <td className={cn(tdCls, "py-3 text-sm text-ink")}>
                      <span className="block truncate">{itemPerson(item)}</span>
                    </td>
                    <td className={cn(tdCls, "py-3")}>
                      <span
                        className={cn(
                          "num text-lg font-extrabold",
                          score !== null && score < AT_RISK_READINESS ? "text-danger" : "text-ink",
                        )}
                      >
                        {score ?? "—"}
                      </span>
                    </td>
                    <td className={cn(tdCls, "py-3 text-right")}>
                      <button className="link cursor-pointer text-sm" onClick={() => setActiveKey(key)} type="button">
                        Review<span className="sr-only"> {itemTitle(item)}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}

              {visible.length === 0 && extrasLoading === 0 ? (
                <tr>
                  <td className={cn(tdCls, "py-10 text-center text-base text-muted")} colSpan={7}>
                    {allItems.length === 0 ? "Inbox clear. Nice work." : "Nothing matches these filters."}
                  </td>
                </tr>
              ) : null}
              {extrasLoading > 0 ? (
                <tr>
                  <td aria-live="polite" className={cn(tdCls, "text-sm text-muted")} colSpan={7} role="status">
                    Loading mentor notes and pitches…
                  </td>
                </tr>
              ) : null}
            </tbody>
          </TableCard>
          {counts.coaching > 0 ? (
            <p className="text-[13px] text-muted">
              Tick sim cards scoring {BULK_MIN_SCORE} or higher to approve them together. Everything else opens for a
              full review.
            </p>
          ) : null}
        </div>
      </PageBody>

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
              className="cursor-pointer text-sm font-bold text-white underline decoration-white decoration-2 underline-offset-4"
              onClick={() => setSelected(new Set())}
              type="button"
            >
              Discard
            </button>
          }
          summary={`Bulk approve works for sim cards at ${BULK_MIN_SCORE} or higher.`}
        />
      ) : null}

      <Modal height="100%" labelledBy={workbenchTitleId} onClose={closeReview} open={activeItem !== null} width="min(1360px, 100%)">
        {activeItem ? (
          <>
            <header className="flex items-start justify-between gap-6 border-b border-line bg-white px-8 py-5">
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="label-caps label-caps--blue">{typeTagLabel(activeItem)}</span>
                <h2
                  className="m-0 text-[28px] leading-[1.1] font-extrabold tracking-[-0.02em] text-ink"
                  id={workbenchTitleId}
                >
                  {itemTitle(activeItem)}
                </h2>
                <span className="text-sm text-muted" suppressHydrationWarning>
                  {itemPerson(activeItem)}
                  {waitingPhrase(itemTimestamp(activeItem), now)}
                </span>
              </div>
              <button
                aria-label="Close review"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line-strong bg-white text-ink hover:border-blue hover:text-blue"
                onClick={closeReview}
                type="button"
              >
                <X aria-hidden className="h-5 w-5" />
              </button>
            </header>

            <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_minmax(420px,520px)] lg:overflow-hidden">
              <section
                aria-label="The work"
                className="flex min-w-0 flex-col gap-4 px-8 py-6 text-[15px] leading-normal text-ink-2 lg:overflow-y-auto"
              >
                <p className="label-caps">The work</p>
                <p className="m-0">{helperText(activeItem)}</p>

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
                  <div className="flex flex-col gap-1.5 rounded-[12px] border border-line bg-white px-4 py-3">
                    <p className="label-caps">SE notes</p>
                    <p className="text-ink">{activeItem.seNotes}</p>
                  </div>
                ) : null}

                {activeItem.inboxType === "pitch" && activeItem.reflectionText ? (
                  <div className="flex flex-col gap-1.5 rounded-[12px] border border-line bg-white px-4 py-3">
                    <p className="label-caps">SE reflection</p>
                    <p className="text-ink">{activeItem.reflectionText}</p>
                  </div>
                ) : null}

                {activeItem.inboxType === "pitch" ? (
                  <Link className="link self-start text-sm" href={`/pitch?review=${activeItem.id}`} target="_blank">
                    Watch video pitch
                  </Link>
                ) : null}
              </section>

              <section
                aria-label="Your sign-off"
                className="flex min-w-0 flex-col gap-4 border-t border-line bg-white px-7 py-6 text-[15px] leading-normal text-ink-2 lg:overflow-y-auto lg:border-t-0 lg:border-l"
              >
                <p className="label-caps">Your sign-off</p>
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
                      showErrors={attemptedKey === itemKey(activeItem)}
                      signoff={signoff.value}
                      tier={tier}
                    />
                  </>
                ) : (
                  <label className="flex flex-col gap-1.5 text-sm font-bold text-ink">
                    Feedback
                    <textarea
                      className="h-40 w-full resize-y rounded-[10px] border border-line-strong bg-white px-3.5 py-3 text-[15px] font-normal text-ink focus:border-blue focus:shadow-[0_0_0_3px_var(--color-blue-soft)] focus:outline-none"
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
                    Grade, 1 to 5
                    <input
                      className="num w-24 rounded-[10px] border border-line-strong bg-white px-3.5 py-2.5 text-[15px] font-semibold text-ink focus:border-blue focus:shadow-[0_0_0_3px_var(--color-blue-soft)] focus:outline-none"
                      max={5}
                      min={1}
                      onChange={(event) => setGrade(event.target.value)}
                      type="number"
                      value={grade}
                    />
                  </label>
                ) : null}
              </section>
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-white px-8 py-4">
              <span className="text-[13px] text-muted">Nothing is sent until you approve or request changes. Esc closes.</span>
              <div className="flex items-center gap-3">
                <button
                  className="btn-secondary disabled:opacity-60"
                  disabled={saving !== null}
                  onClick={() => void submitReview(activeItem, "reject")}
                  type="button"
                >
                  {saving === "reject" ? "Sending…" : "Request changes"}
                </button>
                <button
                  className="btn-primary"
                  disabled={saving !== null}
                  onClick={() => void submitReview(activeItem, "approve")}
                  type="button"
                >
                  {saving === "approve" ? "Approving…" : "Approve"}
                </button>
              </div>
            </footer>
          </>
        ) : null}
      </Modal>
    </>
  );
}
