"use client";

import { Flag, Plus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Drawer } from "@/components/ui/drawer";
import { StatusPill } from "@/components/ui/status-pill";
import { Tag } from "@/components/ui/tag";
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

/** Stages, steps, people and how many are behind, as one compact strip. */
function TrackStats({ track, summaries }: { track: ProgramTrack; summaries: ProgramSummary[] }) {
  const totals = trackTotals(track, summaries);
  const stats = [
    { label: "Stages", value: track.stages.length },
    { label: "Steps", value: totals.steps },
    { label: "People", value: totals.people },
    { label: "Behind", value: totals.atRisk },
  ];
  return (
    <dl className="flex items-stretch divide-x divide-divider overflow-hidden rounded-[12px] border border-line bg-white">
      {stats.map((stat) => (
        <div className="flex min-w-[78px] flex-col gap-0.5 px-4 py-2" key={stat.label}>
          <dt className="label-caps">{stat.label}</dt>
          <dd className={cn("num m-0 text-[20px] leading-none font-extrabold", stat.label === "Behind" && stat.value ? "text-danger" : "text-blue")}>
            {stat.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** "Who's where": one chip that opens a workbench listing each person, their stage and progress. */
function WhosWhere({ track, summaries }: { track: ProgramTrack; summaries: ProgramSummary[] }) {
  const [open, setOpen] = useState(false);
  const rows = track.stages.flatMap((stage) => stagePeople(stage, summaries).map((item) => ({ stage, item })));
  const behind = rows.filter((row) => row.item.health === "at_risk").length;

  return (
    <>
      <button
        aria-haspopup="dialog"
        className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-white px-4 py-2 text-sm font-bold text-ink hover:border-blue hover:text-blue"
        onClick={() => setOpen(true)}
        type="button"
      >
        <Users aria-hidden size={15} />
        Who&apos;s where
        <span className={cn("font-semibold", behind ? "text-danger" : "text-muted")}>
          {rows.length} {rows.length === 1 ? "person" : "people"}
          {behind ? ` · ${behind} behind` : ""}
        </span>
      </button>
      <Drawer
        eyebrow={track.name}
        onClose={() => setOpen(false)}
        open={open}
        size="form"
        subtitle={`${rows.length} ${rows.length === 1 ? "person" : "people"}${behind ? ` · ${behind} behind` : ""}`}
        title="Who's where"
      >
        {rows.length === 0 ? (
          <p className="text-sm text-muted">Nobody is on this program yet.</p>
        ) : (
          <ul className="overflow-hidden rounded-[14px] border border-line bg-white">
            {rows.map(({ stage, item }) => (
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
            ))}
          </ul>
        )}
      </Drawer>
    </>
  );
}

async function send(url: string, method: string, body?: unknown): Promise<boolean> {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }).catch(() => null);
  if (response?.ok) return true;
  const failure = (await response?.json().catch(() => null)) as { error?: unknown } | null;
  toast.error(typeof failure?.error === "string" ? failure.error : "That did not save. Try again.");
  return false;
}

export type StepPreset = "step" | "gate";

/**
 * The timeline: one column per stage, steps in due order, gates marked. Admins add, edit, move and
 * delete steps right here, and add, rename and remove stages.
 */
export function ProgramTimeline({
  track,
  summaries,
  canEdit,
  onClose,
  onEditStage,
  onEditStep,
  onAddStep,
  onChanged,
}: {
  track: ProgramTrack;
  summaries: ProgramSummary[];
  canEdit: boolean;
  onClose: () => void;
  onEditStage: (planId: string) => void;
  onEditStep: (planId: string, stepId: string) => void;
  onAddStep: (planId: string, preset: StepPreset) => void;
  onChanged: () => void;
}) {
  const ranges = stageRanges(track);
  const [renaming, setRenaming] = useState<{ planId: string; name: string } | null>(null);
  const [newStage, setNewStage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const base = `/api/admin/programs/${track.id}`;

  async function run(action: () => Promise<boolean>, done?: string) {
    setBusy(true);
    const ok = await action();
    setBusy(false);
    if (!ok) return false;
    if (done) toast.success(done);
    onChanged();
    return true;
  }

  return (
    <Drawer
      bodyWidth="full"
      breadcrumb={<>Programs / <span className="text-ink">{track.name}</span></>}
      headerExtra={
        <div className="flex flex-wrap items-center justify-end gap-3">
          <TrackStats summaries={summaries} track={track} />
          <WhosWhere summaries={summaries} track={track} />
        </div>
      }
      onClose={onClose}
      open
      subtitle={track.description}
      title={track.name}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3 md:hidden">
          <TrackStats summaries={summaries} track={track} />
          <WhosWhere summaries={summaries} track={track} />
        </div>
        <p className="text-sm text-muted">
          Read left to right. Each stage unlocks the next once its steps are signed off. A gate is a test-out: the stage
          doesn&apos;t finish until it is passed.
        </p>
        <ol className="flex snap-x items-start gap-4 overflow-x-auto pb-3">
          {track.stages.map((stage, stageIndex) => {
            const range = ranges[stageIndex]!;
            const people = stagePeople(stage, summaries);
            const behind = people.filter((item) => item.health === "at_risk").length;
            const steps = [...stage.steps].sort((a, b) => (a.dueOffsetDays ?? 0) - (b.dueOffsetDays ?? 0) || a.order - b.order);
            const gates = steps.filter((step) => step.isGate).length;
            return (
              <li className="flex w-[320px] shrink-0 snap-start flex-col overflow-hidden rounded-[14px] border border-line bg-white shadow-[var(--shadow-card)]" key={stage.planId}>
                <div className="flex flex-col gap-1 border-b border-divider bg-bg px-4 py-3">
                  <span className="label-caps">
                    Stage {stage.index} · days {range.start}–{range.end}
                  </span>
                  <span className="font-bold text-ink">{stage.name}</span>
                  <span className="text-[13px] text-muted">
                    {stage.steps.length} steps{gates ? ` · ${gates} ${gates === 1 ? "gate" : "gates"}` : ""} · {people.length}{" "}
                    {people.length === 1 ? "person" : "people"} here
                    {behind ? <span className="font-bold text-danger"> · {behind} behind</span> : null}
                  </span>
                  {canEdit ? (
                    <span className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <button className="link inline-flex items-center gap-1 text-[13px] font-bold" onClick={() => onAddStep(stage.planId, "step")} type="button">
                        <Plus aria-hidden size={13} /> Add step
                      </button>
                      <button className="link inline-flex items-center gap-1 text-[13px] font-bold" onClick={() => onAddStep(stage.planId, "gate")} type="button">
                        <Flag aria-hidden size={13} /> Add test-out gate
                      </button>
                    </span>
                  ) : null}
                </div>
                <ol className="flex flex-1 flex-col">
                  {steps.map((step) => (
                    <li className={cn("flex flex-col gap-1 border-b border-divider px-4 py-2.5 last:border-b-0", step.isGate && "border-l-4 border-l-blue bg-blue-soft")} key={step.id}>
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-sm font-bold text-ink">{step.title}</span>
                        <span className="num shrink-0 text-[12px] text-muted">day {range.dayOf(step.dueOffsetDays)}</span>
                      </span>
                      <span className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
                        <span>{stepKindLabel(step.type)}</span>
                        {step.isGate ? (
                          <Tag tone="signal">
                            <Flag aria-hidden size={11} />
                            Gate · test-out
                          </Tag>
                        ) : null}
                      </span>
                      {canEdit ? (
                        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                          <button aria-label={`Edit ${step.title}`} className="link" onClick={() => onEditStep(stage.planId, step.id)} type="button">
                            Edit
                          </button>
                          {track.stages.length > 1 ? (
                            <select
                              aria-label={`Move ${step.title} to another stage`}
                              className="max-w-[120px] rounded-[6px] border border-line bg-white py-0.5 text-[12px] text-ink-2"
                              disabled={busy}
                              onChange={(event) => {
                                const target = track.stages.find((item) => item.planId === event.target.value);
                                if (target) void run(() => send(`${base}/steps/${step.id}`, "PATCH", { toPlanId: target.planId }), `Moved to stage ${target.index}.`);
                              }}
                              value=""
                            >
                              <option value="">Move to…</option>
                              {track.stages
                                .filter((item) => item.planId !== stage.planId)
                                .map((item) => (
                                  <option key={item.planId} value={item.planId}>
                                    Stage {item.index}
                                  </option>
                                ))}
                            </select>
                          ) : null}
                          <button
                            aria-label={`Delete ${step.title}`}
                            className="link text-danger"
                            disabled={busy}
                            onClick={() => {
                              if (window.confirm(`Delete "${step.title}" from ${stage.name}? People already on this stage keep their copy.`)) {
                                void run(() => send(`${base}/steps/${step.id}`, "DELETE"), "Step deleted.");
                              }
                            }}
                            type="button"
                          >
                            Delete
                          </button>
                        </span>
                      ) : null}
                    </li>
                  ))}
                  {!steps.length ? <li className="px-4 py-6 text-center text-sm text-muted">No steps yet.</li> : null}
                </ol>
                {canEdit ? (
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-divider px-4 py-2.5 text-sm">
                    <button className="link" onClick={() => onEditStage(stage.planId)} type="button">
                      Edit this stage
                    </button>
                    <span className="flex items-center gap-3">
                      <button aria-haspopup="dialog" className="link" onClick={() => setRenaming({ planId: stage.planId, name: stage.name })} type="button">
                        Rename
                      </button>
                      <button
                        className="link text-danger"
                        disabled={busy}
                        onClick={() => {
                          if (window.confirm(`Remove "${stage.name}" and its ${stage.steps.length} steps? This cannot be undone.`)) {
                            void run(() => send(`${base}/stages/${stage.planId}`, "DELETE"), "Stage removed.");
                          }
                        }}
                        type="button"
                      >
                        Remove
                      </button>
                    </span>
                  </div>
                ) : null}
              </li>
            );
          })}
          {canEdit && track.stages.length < 6 ? (
            <li className="flex w-[260px] shrink-0 snap-start flex-col gap-3 rounded-[14px] border border-dashed border-line-strong bg-white px-4 py-4">
              <button aria-haspopup="dialog" className="link inline-flex items-center gap-1.5 self-start font-bold" onClick={() => setNewStage("")} type="button">
                <Plus aria-hidden size={15} /> Add stage
              </button>
            </li>
          ) : null}
        </ol>
      </div>

      <Drawer
        eyebrow={track.name}
        footer={
          <>
            <button className="btn-primary" disabled={busy} form="rename-stage-form" type="submit">
              Save
            </button>
            <button className="btn-secondary" onClick={() => setRenaming(null)} type="button">
              Cancel
            </button>
          </>
        }
        onClose={() => setRenaming(null)}
        open={Boolean(renaming)}
        size="form"
        title="Rename stage"
      >
        {renaming ? (
          <form
            className="flex flex-col gap-2"
            id="rename-stage-form"
            onSubmit={(event) => {
              event.preventDefault();
              void run(() => send(`${base}/stages/${renaming.planId}`, "PATCH", { name: renaming.name }), "Stage renamed.").then(
                (ok) => ok && setRenaming(null),
              );
            }}
          >
            <label className="text-sm font-bold text-ink" htmlFor="rename-stage-name">
              Stage name
            </label>
            <input
              autoFocus
              className="rounded-[8px] border border-line-strong bg-white px-2.5 py-2 text-sm font-bold text-ink"
              id="rename-stage-name"
              onChange={(event) => setRenaming({ planId: renaming.planId, name: event.target.value })}
              value={renaming.name}
            />
          </form>
        ) : null}
      </Drawer>

      <Drawer
        eyebrow={track.name}
        footer={
          <>
            <button className="btn-primary" disabled={busy || (newStage ?? "").trim().length < 3} form="new-stage-form" type="submit">
              Add stage
            </button>
            <button className="btn-secondary" onClick={() => setNewStage(null)} type="button">
              Cancel
            </button>
          </>
        }
        onClose={() => setNewStage(null)}
        open={newStage !== null}
        size="form"
        title="Add stage"
      >
        {newStage !== null ? (
          <form
            className="flex flex-col gap-2"
            id="new-stage-form"
            onSubmit={(event) => {
              event.preventDefault();
              void run(() => send(`${base}/stages`, "POST", { name: newStage }), "Stage added.").then((ok) => ok && setNewStage(null));
            }}
          >
            <label className="text-sm font-bold text-ink" htmlFor="new-stage-name">
              New stage name
            </label>
            <input
              autoFocus
              className="rounded-[8px] border border-line-strong bg-white px-2.5 py-2 text-sm text-ink"
              id="new-stage-name"
              onChange={(event) => setNewStage(event.target.value)}
              placeholder="Days 121–150 — Mastery"
              value={newStage}
            />
          </form>
        ) : null}
      </Drawer>
    </Drawer>
  );
}
