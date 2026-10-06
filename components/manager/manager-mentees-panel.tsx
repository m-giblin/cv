"use client";

import Link from "next/link";
import { useState } from "react";
import { MentorReviewPanel } from "@/components/manager/mentor-review-panel";
import { MentorCoachingNotesEditor } from "@/components/manager/mentor-coaching-notes-editor";
import { Stat, StatStrip } from "@/components/ui/stat";
import { StatusPill } from "@/components/ui/status-pill";
import { PersonCell } from "@/components/ui/table";
import { Tag } from "@/components/ui/tag";
import type { MenteeAssignment } from "@/lib/data/fetch-mentor-mentees";
import { initials } from "@/lib/utils";

function statusLabel(status: string) {
  const text = status.replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

export function ManagerMenteesPanel({
  mentees,
}: {
  mentees: MenteeAssignment[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <>
      {mentees.length === 0 ? (
        <div className="rounded-[14px] border border-line bg-white p-6">
          <p className="text-sm text-muted">
            No active mentee assignments yet. Your manager will assign you when onboarding plans are
            created.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <StatStrip>
            <Stat label="Active mentees" value={mentees.length} />
            <Stat
              label="Check-ins pending"
              value={mentees.reduce((sum, item) => sum + item.pendingMentorReviews, 0)}
            />
            <Stat
              label="Awaiting manager sign-off"
              value={mentees.reduce((sum, item) => sum + item.awaitingManagerSignoff, 0)}
            />
          </StatStrip>

          <MentorReviewPanel />

          <section className="space-y-3">
            <h3 className="text-xl font-extrabold text-ink">Your mentees</h3>
            <ul className="overflow-hidden rounded-[14px] border border-line bg-white">
              {mentees.map(({ plan, profile, pendingMentorReviews, awaitingManagerSignoff }) => {
                const isOpen = expandedId === profile.id;
                const nextStep = plan.steps
                  .filter((step) => step.status !== "reviewed")
                  .sort((a, b) => a.order - b.order)[0];
                const panelId = `mentee-${profile.id}`;

                return (
                  <li className="border-b border-divider last:border-b-0" key={profile.id}>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-[13px]">
                      <span className="min-w-0 flex-1">
                        <PersonCell
                          initials={initials(profile.fullName)}
                          name={profile.fullName}
                          subline={`${plan.name}, ${formatPercent(plan.progress)} complete`}
                        />
                      </span>
                      {pendingMentorReviews > 0 ? (
                        <Tag tone="warning">
                          {pendingMentorReviews} check-in{pendingMentorReviews === 1 ? "" : "s"}
                        </Tag>
                      ) : null}
                      {awaitingManagerSignoff > 0 ? (
                        <StatusPill tone="blue">Manager sign-off pending</StatusPill>
                      ) : null}
                      <button
                        aria-controls={panelId}
                        aria-expanded={isOpen}
                        className="btn-secondary"
                        onClick={() => setExpandedId(isOpen ? null : profile.id)}
                        type="button"
                      >
                        {isOpen ? "Close" : "Coach"}
                      </button>
                    </div>

                    {isOpen ? (
                      <div className="space-y-4 border-t border-divider bg-bg px-5 py-4" id={panelId}>
                        {nextStep ? (
                          <p className="text-sm text-muted">
                            Next step: <span className="font-bold text-ink">{nextStep.title}</span>
                            {`, ${nextStep.status.replaceAll("_", " ")}`}
                          </p>
                        ) : null}
                        <ul className="overflow-hidden rounded-[14px] border border-line bg-white">
                          {plan.steps.slice(0, 8).map((step) => (
                            <li
                              className="flex items-start justify-between gap-3 border-b border-divider px-4 py-2.5 text-[15px] last:border-b-0"
                              key={step.id}
                            >
                              <span className="min-w-0 font-bold text-ink-2">{step.title}</span>
                              <span className="shrink-0 text-[13px] text-muted">{statusLabel(step.status)}</span>
                            </li>
                          ))}
                        </ul>
                        <MentorCoachingNotesEditor seUserId={profile.id} />
                        {nextStep?.assignmentStepId ? (
                          <Link className="link text-sm" href={`/plan-steps/${nextStep.assignmentStepId}`}>
                            Open current step
                          </Link>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}
    </>
  );
}
