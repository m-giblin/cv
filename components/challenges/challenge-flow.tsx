"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ChallengeSubmissionForm } from "@/components/challenges/submission-form";
import { NextUpPrompt } from "@/components/plans/next-up-prompt";
import { LINE_CARD_CLS } from "@/components/se/form-classes";
import { funChallengeBadge } from "@/lib/account/completion-badges";
import { LIMIT_WORKING_DAYS, REMINDER_WORKING_DAYS, WARNING_WORKING_DAYS, workingDaysElapsed } from "@/lib/challenges/attempt-clock";
import { competencyNamesForChallenge } from "@/lib/challenges/lookup-competencies";
import type { NextUpStep } from "@/lib/plans/next-up";
import type { Challenge, ChallengeSubmission } from "@/lib/types";

export type ChallengeAttemptSummary = {
  id: string;
  challenge_id: string;
  status: string;
  clock_started_at: string;
  restart_allowed_at: string | null;
};

const HEADING_CLS = "text-[15px] font-bold text-ink";
const BODY_CLS = "mt-1.5 text-[15px] leading-[1.5] text-ink-2";
const PRIMARY_LARGE_CLS = "btn-primary inline-flex w-full items-center justify-center gap-2";
const STEPS = [
  ["Choose", "In this library"],
  ["Do the work", "Outside the app"],
  ["Turn it in", "Back here"],
  ["Get reviewed", "By your manager"],
] as const;

function Tracker({ stage }: { stage: number }) {
  return (
    <ol aria-label="How a challenge works" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {STEPS.map(([title, where], index) => (
        <li
          aria-current={index === stage ? "step" : undefined}
          className={`rounded-[12px] border px-3 py-2.5 ${
            index === stage
              ? "border-blue bg-blue text-white"
              : index < stage
                ? "border-line bg-success-soft text-success"
                : "border-line bg-white text-ink-2"
          }`}
          key={title}
        >
          <span className="block text-[13px] font-semibold">Step {index + 1}</span>
          <span className="block text-sm font-bold">{title}</span>
          <span className="block text-[13px]">{where}</span>
        </li>
      ))}
    </ol>
  );
}

function clockMessage(elapsed: number, minutes: number) {
  const left = LIMIT_WORKING_DAYS - elapsed;
  const days = `${left} working ${left === 1 ? "day" : "days"}`;
  if (elapsed >= WARNING_WORKING_DAYS) return { text: `This challenge expires in ${days}.`, warn: true };
  if (elapsed >= REMINDER_WORKING_DAYS) {
    return { text: `This was estimated at about ${minutes} minutes. Still working on it? You have ${days} left.`, warn: true };
  }
  return { text: `Started. You have ${days} to turn it in.`, warn: false };
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-bold text-ink">{value}</dd>
    </div>
  );
}

export function ChallengeFlow({
  challenge,
  attempt,
  submission,
  hasManager,
  managerName,
  defaultReflection,
  onChanged,
  nextUp = null,
  onNextUp,
}: {
  challenge: Challenge;
  attempt?: ChallengeAttemptSummary;
  submission?: ChallengeSubmission;
  hasManager: boolean;
  managerName: string | null;
  defaultReflection: string;
  onChanged: () => void;
  /** After turning it in: the plan's next step. Held by the page, since the panel reloads on submit. */
  nextUp?: NextUpStep | null;
  onNextUp?: (next: NextUpStep | null) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [starting, setStarting] = useState(false);
  const reviewer = managerName ?? "your manager";
  const badge = funChallengeBadge(challenge);
  const skill = competencyNamesForChallenge(challenge)[0];
  const criteriaCount = challenge.successCriteria.length;

  const status = attempt?.status;
  const canceledLocked = status === "canceled" && !attempt?.restart_allowed_at;
  const canStart = !attempt || (status === "canceled" && !canceledLocked);
  const stage = status === "approved" ? 4 : status === "submitted" ? 3 : status === "active" ? (showForm ? 2 : 1) : 0;
  const clock =
    status === "active" && attempt
      ? clockMessage(workingDaysElapsed(new Date(attempt.clock_started_at), new Date()), challenge.estimatedMinutes)
      : null;

  async function start() {
    setStarting(true);
    const response = await fetch("/api/challenge-attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId: challenge.id }),
    }).catch(() => null);
    setStarting(false);
    if (!response?.ok) {
      const body = (await response?.json().catch(() => null)) as { error?: string } | null;
      toast.error(typeof body?.error === "string" ? body.error : "Could not start this challenge.");
      return;
    }
    onChanged();
  }

  return (
    <div className="flex flex-col gap-6">
      <Tracker stage={stage} />

      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="flex min-w-0 flex-col gap-6">
          <p className="rounded-[12px] bg-warning-soft px-4 py-3 text-sm leading-[1.5] text-ink">
            <strong>You&apos;ll do this outside the app.</strong> Use your lab tenant and usual tools, then come back with a
            link or file. For a video, record it in Teams and copy the link.
          </p>

          <section>
            <h3 className={HEADING_CLS}>What it is</h3>
            <p className={BODY_CLS}>{challenge.description}</p>
          </section>

          {challenge.steps.length > 0 ? (
            <section>
              <h3 className={HEADING_CLS}>What to do</h3>
              <ol className="mt-1.5 list-decimal space-y-1.5 pl-5 text-[15px] leading-[1.5] text-ink-2">
                {challenge.steps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </section>
          ) : null}

          {criteriaCount > 0 ? (
            <section>
              <h3 className={HEADING_CLS}>What your manager is looking for</h3>
              <ul className="mt-1.5 list-disc space-y-1.5 pl-5 text-[15px] leading-[1.5] text-ink-2">
                {challenge.successCriteria.map((criterion) => (
                  <li key={criterion}>{criterion}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <h3 className={HEADING_CLS}>How it&apos;s scored</h3>
            <p className={BODY_CLS}>
              No points or percentages. Your manager marks each item <strong>Met</strong> or <strong>Not yet</strong>.
              Meet them all and it&apos;s <strong>Approved</strong>. If not, you get notes on what to change and can resubmit
              as many times as you need.
            </p>
          </section>

          <section>
            <h3 className={HEADING_CLS}>Your time limit</h3>
            <p className={BODY_CLS}>
              You have <strong>5 working days from when you start</strong>. You&apos;ll get a reminder on day 2 and a warning
              on day 3. On day 5 it&apos;s canceled as not meeting the challenge requirements, and your manager is told so you
              can talk about it. After that talk, you can start again. The clock stops when you turn it in, and if your
              work is sent back you get a new 5 working days.
            </p>
          </section>

          {challenge.linkedResources.length > 0 ? (
            <section>
              <h3 className={HEADING_CLS}>Resources</h3>
              <ul className="mt-2 flex flex-col gap-1.5">
                {challenge.linkedResources.map((resource) => (
                  <li key={resource}>
                    <a className="link inline-flex items-center gap-1.5 text-sm" href={resource} rel="noreferrer" target="_blank">
                      {resource.replace(/^https?:\/\//, "").slice(0, 64)}
                      <ExternalLink aria-hidden="true" className="h-4 w-4" />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside aria-label="Summary" className={`${LINE_CARD_CLS} flex flex-col gap-3 p-4`}>
          <dl className="flex flex-col gap-2">
            <Row label="Time" value={`About ${challenge.estimatedMinutes} min`} />
            <Row label="Time limit" value="5 working days once started" />
            {skill ? <Row label="Builds skill in" value={skill} /> : null}
            <Row label="Reviewed by" value={managerName ?? "Your manager"} />
            <Row label="Review time" value="Within 5 working days" />
            <Row label="You'll earn" value={`${badge.funTitle} badge`} />
          </dl>

          {clock ? (
            <p className={`rounded-[10px] px-3 py-2 text-sm font-bold ${clock.warn ? "bg-warning-soft text-warning" : "bg-success-soft text-success"}`} role="status">
              {clock.text}
            </p>
          ) : null}

          {submission?.managerFeedback && status === "active" ? (
            <div className="rounded-[10px] bg-warning-soft px-3 py-2">
              <p className="text-[13px] font-semibold text-warning">What {reviewer} asked you to change</p>
              <p className="mt-1 text-sm leading-[1.5] text-ink">{submission.managerFeedback}</p>
            </div>
          ) : null}

          {canceledLocked ? (
            <p className="rounded-[10px] bg-danger-soft px-3 py-2 text-sm font-bold text-danger" role="status">
              Canceled: challenge requirements not met. Talk with {reviewer}, who can then allow a restart.
            </p>
          ) : null}

          {canStart ? (
            hasManager ? (
              <>
                <button className={PRIMARY_LARGE_CLS} disabled={starting} onClick={() => void start()} type="button">
                  {starting ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
                  {status === "canceled" ? "Start again" : "Start this challenge"}
                </button>
                <p className="text-[13px] text-muted">Start only when you&apos;re ready. Your 5 working days begin when you press Start.</p>
              </>
            ) : (
              <p className="rounded-[10px] bg-warning-soft px-3 py-2 text-sm text-ink" role="status">
                You need a manager to review this. Contact your admin to have one assigned.
              </p>
            )
          ) : null}

          {status === "active" && !showForm ? (
            <button className={PRIMARY_LARGE_CLS} onClick={() => setShowForm(true)} type="button">
              I&apos;m ready to turn it in
            </button>
          ) : null}

          {status === "submitted" ? (
            <p className="rounded-[10px] bg-blue-soft px-3 py-2 text-sm text-ink" role="status">
              <strong>With {reviewer} for review.</strong>{" "}
              {nextUp ? "Keep going with your plan while it's reviewed." : "Nothing else to do for now."} You&apos;ll get a notification either way.
            </p>
          ) : null}
          {status === "submitted" && nextUp ? <NextUpPrompt next={nextUp} onLater={() => onNextUp?.(null)} /> : null}

          {status === "approved" ? (
            <div className="rounded-[10px] bg-success-soft px-3 py-2 text-sm text-ink" role="status">
              <p className="font-bold">
                <span aria-hidden="true">{badge.emoji}</span> Badge earned: {badge.funTitle}
              </p>
              <Link className="link text-sm" href="/account">
                See your trophy case
              </Link>
            </div>
          ) : null}
        </aside>
      </div>

      {status === "active" && showForm ? (
        <div id="challenge-submit">
          <ChallengeSubmissionForm
            challengeId={challenge.id}
            defaultReflection={defaultReflection}
            onSubmitted={(next) => {
              onNextUp?.(next);
              onChanged();
            }}
            reviewerName={reviewer}
            variant="handoff"
          />
        </div>
      ) : null}
    </div>
  );
}
