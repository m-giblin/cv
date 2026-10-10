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
import { isStepOverdue, summarizeEnrollment, type EnrollmentHealth } from "@/lib/programs/program-model";
import { initials } from "@/lib/utils";

function statusLabel(status: string) {
  const text = status.replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const HEALTH_PILL: Record<EnrollmentHealth, { tone: "success" | "danger" | "neutral"; label: string }> = {
  complete: { tone: "success", label: "Complete" },
  on_track: { tone: "success", label: "On track" },
  at_risk: { tone: "danger", label: "Behind" },
  not_started: { tone: "neutral", label: "Not started" },
};

function shortDate(iso: string | undefined | null) {
  if (!iso) return "—";
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
  const summaries = mentees.map((item) => summarizeEnrollment(item.plan, item.profile));
  const behind = summaries.filter((item) => item.health === "at_risk").length;
  const overdueSteps = summaries.reduce((sum, item) => sum + item.overdue, 0);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      {mentees.length === 0 ? (
        <div className="rounded-[14px] border border-line bg-white p-6">
          <p className="text-sm text-muted">
            No active mentee assignments yet. A manager assigns you as mentor when they enroll someone in a program.
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
            <Stat label="Behind schedule" tone={behind > 0 ? "danger" : "blue"} value={behind} />
            <Stat label="Overdue steps" tone={overdueSteps > 0 ? "danger" : "blue"} value={overdueSteps} />
            <Stat
              label="Awaiting manager sign-off"
              value={mentees.reduce((sum, item) => sum + item.awaitingManagerSignoff, 0)}
            />
          </StatStrip>

          <MentorReviewPanel />

          <section className="space-y-3">
            <h3 className="text-xl font-extrabold text-ink">Your mentees</h3>
            <ul className="overflow-hidden rounded-[14px] border border-line bg-white">
              {mentees.map(({ plan, profile, pendingMentorReviews, awaitingManagerSignoff }, index) => {
                const summary = summaries[index]!;
                const health = HEALTH_PILL[summary.health];
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
                          subline={`${plan.name} · week ${summary.week} of 13 · ${summary.done}/${summary.total} steps · ${formatPercent(plan.progress)}`}
                        />
                      </span>
                      <StatusPill tone={health.tone}>{health.label}</StatusPill>
                      {summary.overdue > 0 ? <Tag tone="warning">{summary.overdue} overdue</Tag> : null}
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
                        <p className="text-sm text-muted">
                          Started <span className="font-bold text-ink">{shortDate(plan.startDate)}</span>
                          {" · "}target finish <span className="font-bold text-ink">{shortDate(plan.targetCompletion)}</span>
                          {" · "}reports to their manager on pace, progress and blockers
                        </p>
                        {nextStep ? (
                          <p className="text-sm text-muted">
                            Next step: <span className="font-bold text-ink">{nextStep.title}</span>
                            {`, ${nextStep.status.replaceAll("_", " ")}`}
                          </p>
                        ) : null}
                        <ul className="overflow-hidden rounded-[14px] border border-line bg-white">
                          {[...plan.steps].sort((a, b) => a.order - b.order).map((step) => (
                            <li
                              className="flex items-start justify-between gap-3 border-b border-divider px-4 py-2.5 text-[15px] last:border-b-0"
                              key={step.id}
                            >
                              <span className="min-w-0 font-bold text-ink-2">{step.title}</span>
                              <span className={`shrink-0 text-[13px] ${isStepOverdue(step, today) ? "font-bold text-danger" : "text-muted"}`}>
                                {step.dueDate ? `Due ${shortDate(step.dueDate)} · ` : ""}
                                {isStepOverdue(step, today) ? "Overdue" : statusLabel(step.status)}
                              </span>
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
