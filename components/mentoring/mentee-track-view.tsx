"use client";

import { StatusPill } from "@/components/ui/status-pill";
import type { MenteeTrack, TrackStage, TrackStageState } from "@/lib/mentoring/fetch-mentee-track";
import type { PlanStep } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATE: Record<TrackStageState, { tone: "success" | "blue" | "neutral"; label: string }> = {
  done: { tone: "success", label: "Approved" },
  current: { tone: "blue", label: "In progress" },
  upcoming: { tone: "neutral", label: "Opens after the gate" },
};

/** The whole program, one card per stage. A card opens that stage's steps in the step workbench. */
export function MenteeTrackView({
  track,
  onOpenStep,
}: {
  track: MenteeTrack;
  onOpenStep: (stage: TrackStage, step: PlanStep) => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-lg font-extrabold text-ink">The full path: {track.programName}</h4>
        <span className="text-[13px] text-muted">A manager approves each gate before the next stage opens.</span>
      </div>
      <ol className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2 xl:grid-cols-4">
        {track.stages.map((stage) => {
          const state = STATE[stage.state];
          const first = stage.steps.find((step) => step.status !== "reviewed" && step.status !== "completed") ?? stage.steps[0];
          return (
            <li key={stage.planId}>
              <button
                className={cn(
                  "flex h-full w-full flex-col gap-1.5 rounded-[14px] border bg-white p-4 text-left hover:border-blue disabled:cursor-default disabled:hover:border-line",
                  stage.state === "current" ? "border-blue" : "border-line",
                )}
                disabled={!first}
                onClick={() => (first ? onOpenStep(stage, first) : undefined)}
                type="button"
              >
                <span className="label-caps">Stage {stage.index}</span>
                <span className="font-bold text-ink">{stage.name}</span>
                <span className="text-[13px] text-muted">
                  {stage.steps.length} steps{first ? " · open to preview" : ""}
                </span>
                <StatusPill tone={state.tone}>{state.label}</StatusPill>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
