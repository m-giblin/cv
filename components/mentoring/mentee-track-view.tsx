"use client";

import { useState } from "react";
import { StatusPill } from "@/components/ui/status-pill";
import { stepTypeLabel } from "@/lib/mentoring/mentor-guide";
import type { MenteeTrack, TrackStage, TrackStageState } from "@/lib/mentoring/fetch-mentee-track";
import type { PlanStep } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATE: Record<TrackStageState, { tone: "success" | "blue" | "neutral"; label: string }> = {
  done: { tone: "success", label: "Approved" },
  current: { tone: "blue", label: "In progress" },
  upcoming: { tone: "neutral", label: "Opens after the gate" },
};

/** The whole program: every stage, with the steps of any stage the mentor wants to prepare for. */
export function MenteeTrackView({
  track,
  onOpenStep,
}: {
  track: MenteeTrack;
  onOpenStep: (stage: TrackStage, step: PlanStep) => void;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const open = track.stages.find((stage) => stage.index === openIndex) ?? null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-lg font-extrabold text-ink">The full path: {track.programName}</h4>
        <span className="text-[13px] text-muted">A manager approves each gate before the next stage opens.</span>
      </div>
      <ol className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2 xl:grid-cols-4">
        {track.stages.map((stage) => {
          const state = STATE[stage.state];
          const isOpen = openIndex === stage.index;
          return (
            <li key={stage.planId}>
              <button
                aria-expanded={isOpen}
                className={cn(
                  "flex h-full w-full flex-col gap-1.5 rounded-[14px] border bg-white p-4 text-left hover:border-blue",
                  isOpen ? "border-blue" : stage.state === "current" ? "border-blue/50" : "border-line",
                )}
                onClick={() => setOpenIndex(isOpen ? null : stage.index)}
                type="button"
              >
                <span className="label-caps">Stage {stage.index}</span>
                <span className="font-bold text-ink">{stage.name}</span>
                <span className="text-[13px] text-muted">{stage.steps.length} steps</span>
                <StatusPill tone={state.tone}>{state.label}</StatusPill>
              </button>
            </li>
          );
        })}
      </ol>
      {open ? (
        <div className="flex flex-col gap-2 rounded-[14px] border border-line bg-white p-4">
          {open.description ? <p className="text-[15px] text-ink-2">{open.description}</p> : null}
          <ul className="m-0 flex list-none flex-col p-0">
            {open.steps.map((step) => (
              <li className="border-b border-divider last:border-b-0" key={step.id}>
                <button
                  className="flex w-full items-start justify-between gap-3 px-2 py-2 text-left text-[15px] hover:bg-blue-soft"
                  onClick={() => onOpenStep(open, step)}
                  type="button"
                >
                  <span className="font-bold text-ink-2">{step.title}</span>
                  <span className="shrink-0 text-[13px] text-muted">
                    {step.isSegmentGate ? "Manager gate" : stepTypeLabel(step.type)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
