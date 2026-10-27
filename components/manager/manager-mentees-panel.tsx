"use client";

import Link from "next/link";
import { useState } from "react";
import { MentorReviewPanel } from "@/components/manager/mentor-review-panel";
import { MentorCoachingNotesEditor } from "@/components/manager/mentor-coaching-notes-editor";
import { HiringBriefCard } from "@/components/mentoring/hiring-brief-card";
import { MenteeTrackView } from "@/components/mentoring/mentee-track-view";
import { MentorCheckinWorkbench } from "@/components/mentoring/mentor-checkin-workbench";
import { MentorManagerNote } from "@/components/mentoring/mentor-manager-note";
import { MentorStepWorkbench } from "@/components/mentoring/mentor-step-workbench";
import { Stat, StatStrip } from "@/components/ui/stat";
import { StatusPill } from "@/components/ui/status-pill";
import { PersonCell } from "@/components/ui/table";
import { Tag } from "@/components/ui/tag";
import type { MenteeAssignment } from "@/lib/data/fetch-mentor-mentees";
import { stepTypeLabel } from "@/lib/mentoring/mentor-guide";
import { mentorAttention } from "@/lib/mentoring/mentor-records-model";
import { isStepOverdue, summarizeEnrollment, type EnrollmentHealth } from "@/lib/programs/program-model";
import type { PlanStep } from "@/lib/types";
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

function byOrder(steps: PlanStep[]) {
  return [...steps].sort((a, b) => a.order - b.order);
}

/** Which step is open, by id, so the workbench always reads the latest server data after a refresh. */
type OpenStep = { assignmentId: string; stepId: string; stagePlanId?: string };

export function ManagerMenteesPanel({
  mentees,
}: {
  mentees: MenteeAssignment[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [openStep, setOpenStep] = useState<OpenStep | null>(null);
  const [checkinFor, setCheckinFor] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const summaries = mentees.map((item) => summarizeEnrollment(item.plan, item.profile));
  const behind = summaries.filter((item) => item.health === "at_risk").length;
  const overdueSteps = summaries.reduce((sum, item) => sum + item.overdue, 0);
  const today = new Date().toISOString().slice(0, 10);

  const openMentee = openStep ? mentees.find((item) => item.plan.id === openStep.assignmentId) : undefined;
  const openStage =
    openStep?.stagePlanId && openStep.stagePlanId !== openMentee?.plan.planTemplateId
      ? openMentee?.track?.stages.find((stage) => stage.planId === openStep.stagePlanId)
      : undefined;
  const openSteps = openStage ? byOrder(openStage.steps) : openMentee ? byOrder(openMentee.plan.steps) : [];
  const checkinMentee = checkinFor ? mentees.find((item) => item.plan.id === checkinFor) : undefined;
  const noteMentee = noteFor ? mentees.find((item) => item.plan.id === noteFor) : undefined;

  return (
    <>
      {mentees.length === 0 ? (
        <div className="rounded-[14px] border border-line bg-white p-6">
          <p className="text-sm text-muted">
            No active mentee assignments yet. A manager assigns you as mentor when they enroll someone in a program.
          </p>
          <Link className="link mt-2 inline-block text-sm" href="/mentoring/guide">
            Read the mentor guide while you wait
          </Link>
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
              {mentees.map((mentee, index) => {
                const { plan, profile, pendingMentorReviews, awaitingManagerSignoff, records, track } = mentee;
                const summary = summaries[index]!;
                const health = HEALTH_PILL[summary.health];
                const isOpen = expandedId === plan.id;
                const orderedSteps = byOrder(plan.steps);
                const nextStep = orderedSteps.find((step) => step.status !== "reviewed" && step.status !== "completed");
                const panelId = `mentee-${plan.id}`;
                const attention = mentorAttention(plan.steps, records, today);
                const openFor = (step: PlanStep, stagePlanId?: string) =>
                  setOpenStep({ assignmentId: plan.id, stepId: step.id, stagePlanId });

                return (
                  <li className="border-b border-divider last:border-b-0" key={plan.id}>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-[13px]">
                      <span className="min-w-0 flex-1">
                        <PersonCell
                          initials={initials(profile.fullName)}
                          name={profile.fullName}
                          subline={`${plan.name} · ${summary.done}/${summary.total} steps · ${formatPercent(plan.progress)}`}
                        />
                      </span>
                      <StatusPill tone={health.tone}>{health.label}</StatusPill>
                      {pendingMentorReviews > 0 ? (
                        <Tag tone="warning">
                          {pendingMentorReviews} check-in{pendingMentorReviews === 1 ? "" : "s"}
                        </Tag>
                      ) : null}
                      {awaitingManagerSignoff > 0 ? (
                        <StatusPill tone="blue">Manager sign-off pending</StatusPill>
                      ) : null}
                      <button className="btn-secondary" onClick={() => setCheckinFor(plan.id)} type="button">
                        Log a 1:1
                      </button>
                      <button className="btn-secondary" onClick={() => setNoteFor(plan.id)} type="button">
                        Note to manager
                      </button>
                      <button
                        aria-controls={panelId}
                        aria-expanded={isOpen}
                        className="btn-secondary"
                        onClick={() => setExpandedId(isOpen ? null : plan.id)}
                        type="button"
                      >
                        {isOpen ? "Close" : "Coach"}
                      </button>
                    </div>
                    {attention.length ? (
                      <div className="flex flex-wrap gap-2 px-5 pb-3">
                        {attention.map((item) => (
                          <Tag key={item.text} tone={item.tone}>
                            {item.text}
                          </Tag>
                        ))}
                      </div>
                    ) : null}

                    {isOpen ? (
                      <div className="space-y-4 border-t border-divider bg-bg px-5 py-4" id={panelId}>
                        <HiringBriefCard brief={records.hiringBrief} firstName={profile.fullName.split(" ")[0] ?? profile.fullName} />
                        <p className="text-sm text-muted">
                          Started <span className="font-bold text-ink">{shortDate(plan.startDate)}</span>
                          {" · "}target finish <span className="font-bold text-ink">{shortDate(plan.targetCompletion)}</span>
                          {" · "}click any step to see the task, {profile.fullName.split(" ")[0]}&apos;s work, and how to coach it
                        </p>
                        {track ? (
                          <MenteeTrackView onOpenStep={(stage, step) => openFor(step, stage.planId)} track={track} />
                        ) : null}
                        <h4 className="text-lg font-extrabold text-ink">{plan.name}</h4>
                        <ul className="overflow-hidden rounded-[14px] border border-line bg-white">
                          {orderedSteps.map((step) => {
                            const feedbackCount = records.feedback.filter((item) => item.assignmentStepId === step.assignmentStepId).length;
                            const hasWork = (mentee.evidence[step.id] ?? []).length > 0;
                            return (
                              <li className="border-b border-divider last:border-b-0" key={step.id}>
                                <button
                                  className="flex w-full items-start justify-between gap-3 px-4 py-2.5 text-left text-[15px] hover:bg-blue-soft focus-visible:bg-blue-soft"
                                  onClick={() => openFor(step)}
                                  type="button"
                                >
                                  <span className="flex min-w-0 flex-col">
                                    <span className="font-bold text-ink-2">{step.title}</span>
                                    <span className="text-[13px] text-muted">
                                      {step.isSegmentGate ? "Manager gate" : stepTypeLabel(step.type)}
                                      {hasWork ? " · work to review" : ""}
                                      {feedbackCount ? ` · ${feedbackCount} feedback` : ""}
                                    </span>
                                  </span>
                                  <span
                                    className={`shrink-0 text-[13px] ${isStepOverdue(step, today) ? "font-bold text-danger" : "text-muted"}`}
                                  >
                                    {step.dueDate ? `Due ${shortDate(step.dueDate)} · ` : ""}
                                    {isStepOverdue(step, today) ? "Overdue" : statusLabel(step.status)}
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                        <MentorCoachingNotesEditor seUserId={profile.id} />
                        {nextStep ? (
                          <button className="link text-sm" onClick={() => openFor(nextStep)} type="button">
                            Open current step
                          </button>
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
      {openMentee ? (
        <MentorStepWorkbench
          evidence={openMentee.evidence}
          menteeName={openMentee.profile.fullName}
          onClose={() => setOpenStep(null)}
          onSelect={(step) => setOpenStep((current) => (current ? { ...current, stepId: step.id } : current))}
          preview={Boolean(openStage && openStage.state === "upcoming")}
          records={openMentee.records}
          resources={openMentee.resources}
          stageName={openStage?.name}
          step={openSteps.find((step) => step.id === openStep?.stepId) ?? null}
          steps={openSteps}
        />
      ) : null}
      {noteMentee ? (
        <MentorManagerNote
          assignmentId={noteMentee.plan.id}
          menteeName={noteMentee.profile.fullName}
          notes={noteMentee.records.managerNotes.filter((item) => item.assignmentId === noteMentee.plan.id)}
          onClose={() => setNoteFor(null)}
          open
        />
      ) : null}
      {checkinMentee ? (
        <MentorCheckinWorkbench
          menteeName={checkinMentee.profile.fullName}
          onClose={() => setCheckinFor(null)}
          open
          plan={checkinMentee.plan}
          records={checkinMentee.records}
        />
      ) : null}
    </>
  );
}
