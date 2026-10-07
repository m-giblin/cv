"use client";

import { Flag, Plus } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { StatusPill } from "@/components/ui/status-pill";
import type { ProgramSummary } from "@/lib/programs/program-model";
import { stepKindLabel } from "@/lib/programs/step-kinds";
import type { ProgramTrack, TrackStage } from "@/lib/programs/tracks";
import { cn } from "@/lib/utils";

/** People on a stage, from the enrollment summaries (a stage is a plan). */
function stagePeople(stage: TrackStage, summaries: ProgramSummary[]) {
  return summaries.find((summary) => summary.id === stage.planId)?.enrollments ?? [];
}

function trackTotals(track: ProgramTrack, summaries: ProgramSummary[]) {
  const enrollments = track.stages.flatMap((stage) => stagePeople(stage, summaries));
  return {
    steps: track.stages.reduce((sum, stage) => sum + stage.steps.length, 0),
    people: new Set(enrollments.map((item) => item.plan.userId)).size,
    atRisk: new Set(enrollments.filter((item) => item.health === "at_risk").map((item) => item.plan.userId)).size,
    days: stageRanges(track).at(-1)?.end ?? 0,
  };
}

/** A stage runs until its last step is due. */
function stageLength(stage: TrackStage) {
  return Math.max(7, ...stage.steps.map((step) => step.dueOffsetDays ?? 0));
}

/**
 * Day ranges per stage. Some programs date steps from the start of each stage (day 1 again in every
 * stage), others from the start of the whole program (day 28, 60, 90...). Offsets that keep climbing
 * from stage to stage are read as program days.
 */
function stageRanges(track: ProgramTrack) {
  const bounds = track.stages.map((stage) => {
    const offsets = stage.steps.map((step) => step.dueOffsetDays ?? 0);
    return { min: offsets.length ? Math.min(...offsets) : 0, max: offsets.length ? Math.max(...offsets) : 0 };
  });
  const programDays = bounds.length > 1 && bounds.every((bound, index) => index === 0 || bound.min >= bounds[index - 1]!.max);
  let cursor = 0;
  return track.stages.map((stage, index) => {
    const start = cursor + 1;
    const end = programDays ? Math.max(bounds[index]!.max, start) : cursor + stageLength(stage);
    cursor = end;
    return { start, end, dayOf: (offset: number | null) => (programDays ? (offset ?? end) : start - 1 + (offset ?? 0)) };
  });
}

/** The program cards at the top of the Onboarding programs tab. */
export function ProgramTrackCards({
  tracks,
  summaries,
  onOpen,
}: {
  tracks: ProgramTrack[];
  summaries: ProgramSummary[];
  onOpen: (id: string) => void;
}) {
  if (!tracks.length) return null;
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {tracks.map((track) => {
        const totals = trackTotals(track, summaries);
        return (
          <button
            className="flex flex-col gap-3 rounded-[14px] border border-line bg-white p-5 text-left shadow-[var(--shadow-card)] hover:border-line-strong"
            key={track.id}
            onClick={() => onOpen(track.id)}
            type="button"
          >
            <span className="flex items-start justify-between gap-3">
              <span>
                <span className="block text-[18px] font-extrabold text-ink">{track.name}</span>
                <span className="block text-sm text-muted">{track.description}</span>
              </span>
              {totals.atRisk ? (
                <StatusPill tone="danger">{totals.atRisk} behind</StatusPill>
              ) : totals.people ? (
                <StatusPill tone="success">On track</StatusPill>
              ) : (
                <StatusPill tone="neutral">Nobody on it</StatusPill>
              )}
            </span>
            <span className="flex gap-1" aria-hidden>
              {stageRanges(track).map((range, index) => (
                <span className="h-2 flex-1 rounded-full bg-blue" key={track.stages[index]!.planId} style={{ flexGrow: range.end - range.start + 1 }} />
              ))}
            </span>
            <span className="text-sm text-ink">
              {track.stages.length} stages · {totals.steps} steps · about {Math.round(totals.days / 7)} weeks · {totals.people}{" "}
              {totals.people === 1 ? "person" : "people"} on it
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** The timeline: one column per stage, steps in due order, gates marked. */
export function ProgramTimeline({
  track,
  summaries,
  canEdit,
  onClose,
  onEditStage,
  onEditStep,
  onAddStep,
}: {
  track: ProgramTrack;
  summaries: ProgramSummary[];
  canEdit: boolean;
  onClose: () => void;
  onEditStage: (planId: string) => void;
  onEditStep: (planId: string, stepId: string) => void;
  onAddStep: (planId: string) => void;
}) {
  const totals = trackTotals(track, summaries);
  const ranges = stageRanges(track);

  return (
    <Drawer
      bodyWidth="full"
      eyebrow="Program"
      mainLabel="Timeline"
      onClose={onClose}
      open
      side={
        <div className="flex flex-col gap-5">
          <dl className="grid grid-cols-2 overflow-hidden rounded-[14px] border border-line bg-white shadow-[var(--shadow-card)]">
            {[
              { label: "Stages", value: track.stages.length },
              { label: "Steps", value: totals.steps },
              { label: "People", value: totals.people },
              { label: "Behind", value: totals.atRisk },
            ].map((stat) => (
              <div className="flex flex-col gap-1 border-b border-r border-divider px-3 py-3 [&:nth-child(2n)]:border-r-0 [&:nth-child(n+3)]:border-b-0" key={stat.label}>
                <dt className="label-caps">{stat.label}</dt>
                <dd className={cn("num text-[22px] leading-none font-extrabold", stat.label === "Behind" && stat.value ? "text-danger" : "text-blue")}>
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
          <section className="flex flex-col gap-2">
            <h3 className="label-caps">Who&apos;s where</h3>
            {track.stages.every((stage) => !stagePeople(stage, summaries).length) ? (
              <p className="text-sm text-muted">Nobody is on this program yet.</p>
            ) : (
              <ul className="overflow-hidden rounded-[14px] border border-line bg-white shadow-[var(--shadow-card)]">
                {track.stages.flatMap((stage) =>
                  stagePeople(stage, summaries).map((item) => (
                    <li className="flex items-center justify-between gap-3 border-b border-divider px-4 py-2.5 last:border-b-0" key={item.plan.id}>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-ink">{item.person?.fullName ?? "Team member"}</span>
                        <span className="block text-[13px] text-muted">
                          Stage {stage.index} · {item.progress}% done
                        </span>
                      </span>
                      {item.health === "at_risk" ? (
                        <StatusPill tone="danger">{item.overdue} overdue</StatusPill>
                      ) : item.health === "complete" ? (
                        <StatusPill tone="success">Done</StatusPill>
                      ) : (
                        <StatusPill tone="blue">On track</StatusPill>
                      )}
                    </li>
                  )),
                )}
              </ul>
            )}
          </section>
        </div>
      }
      sideLabel="People"
      subtitle={track.description}
      title={track.name}
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">
          Read left to right. Each stage unlocks the next once its steps are signed off; the flagged step is the gate.
        </p>
        <ol className="flex snap-x gap-4 overflow-x-auto pb-3">
          {track.stages.map((stage, stageIndex) => {
            const range = ranges[stageIndex]!;
            const people = stagePeople(stage, summaries);
            const behind = people.filter((item) => item.health === "at_risk").length;
            const steps = [...stage.steps].sort((a, b) => (a.dueOffsetDays ?? 0) - (b.dueOffsetDays ?? 0) || a.order - b.order);
            return (
              <li className="flex w-[300px] shrink-0 snap-start flex-col overflow-hidden rounded-[14px] border border-line bg-white shadow-[var(--shadow-card)]" key={stage.planId}>
                <div className="flex flex-col gap-1 border-b border-divider bg-bg px-4 py-3">
                  <span className="label-caps">
                    Stage {stage.index} · days {range.start}–{range.end}
                  </span>
                  <span className="font-bold text-ink">{stage.name}</span>
                  <span className="text-[13px] text-muted">
                    {stage.steps.length} steps · {people.length} {people.length === 1 ? "person" : "people"} here
                    {behind ? <span className="font-bold text-danger"> · {behind} behind</span> : null}
                  </span>
                </div>
                <ol className="flex flex-1 flex-col">
                  {steps.map((step) => (
                    <li className={cn("flex flex-col gap-0.5 border-b border-divider px-4 py-2.5 last:border-b-0", step.isGate && "bg-blue-soft")} key={step.id}>
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-sm font-bold text-ink">{step.title}</span>
                        <span className="num shrink-0 text-[12px] text-muted">day {range.dayOf(step.dueOffsetDays)}</span>
                      </span>
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-[13px] text-muted">{stepKindLabel(step.type)}</span>
                        {canEdit ? (
                          <button
                            aria-label={`Edit ${step.title}`}
                            className="link shrink-0 text-[13px]"
                            onClick={() => onEditStep(stage.planId, step.id)}
                            type="button"
                          >
                            Edit
                          </button>
                        ) : null}
                      </span>
                      {step.isGate ? (
                        <span className="inline-flex items-center gap-1 text-[12px] font-bold text-blue">
                          <Flag aria-hidden size={12} /> Gate: unlocks the next stage
                        </span>
                      ) : null}
                    </li>
                  ))}
                  {!steps.length ? <li className="px-4 py-6 text-center text-sm text-muted">No steps yet.</li> : null}
                </ol>
                {canEdit ? (
                  <div className="flex items-center justify-between gap-3 border-t border-divider px-4 py-2.5 text-sm">
                    <button className="link inline-flex items-center gap-1 font-bold" onClick={() => onAddStep(stage.planId)} type="button">
                      <Plus aria-hidden size={14} /> Add step
                    </button>
                    <button className="link" onClick={() => onEditStage(stage.planId)} type="button">
                      Edit this stage
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </Drawer>
  );
}
