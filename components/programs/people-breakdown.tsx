"use client";

import { Drawer } from "@/components/ui/drawer";
import { StatusPill } from "@/components/ui/status-pill";
import type { EnrollmentSummary, ProgramSummary } from "@/lib/programs/program-model";
import type { ProgramTrack } from "@/lib/programs/tracks";
import type { Profile } from "@/lib/types";

export type BreakdownKind = "enrolled" | "at_risk" | "completion" | "unenrolled";

const TITLES: Record<BreakdownKind, { title: string; subtitle: string }> = {
  enrolled: { title: "SEs enrolled", subtitle: "Everyone with an active plan, and where they are." },
  at_risk: { title: "SEs at risk", subtitle: "People with overdue steps, most overdue first." },
  completion: { title: "Completion", subtitle: "Every enrollment, least complete first." },
  unenrolled: { title: "SEs with no program", subtitle: "People who aren't on any plan yet." },
};

/** The list behind a Programs stat: who it counts, and why. */
export function PeopleBreakdown({
  kind,
  programs,
  tracks,
  unenrolled,
  onClose,
}: {
  kind: BreakdownKind;
  programs: ProgramSummary[];
  tracks: ProgramTrack[];
  unenrolled: Profile[];
  onClose: () => void;
}) {
  const programOf = (planId: string) => {
    const track = tracks.find((item) => item.stages.some((stage) => stage.planId === planId));
    const stage = track?.stages.find((item) => item.planId === planId);
    return track && stage ? `${track.name}, stage ${stage.index}` : null;
  };
  const rows: (EnrollmentSummary & { where: string })[] = programs.flatMap((program) =>
    program.enrollments
      .filter((item) => item.health !== "complete")
      .map((item) => ({ ...item, where: programOf(program.id) ?? program.name })),
  );
  const shown =
    kind === "at_risk"
      ? rows.filter((row) => row.health === "at_risk").sort((a, b) => b.overdue - a.overdue)
      : kind === "completion"
        ? [...rows].sort((a, b) => a.progress - b.progress)
        : [...rows].sort((a, b) => (a.person?.fullName ?? "").localeCompare(b.person?.fullName ?? ""));

  return (
    <Drawer onClose={onClose} open size="form" subtitle={TITLES[kind].subtitle} title={TITLES[kind].title}>
      {kind === "unenrolled" ? (
        unenrolled.length ? (
          <ul className="overflow-hidden rounded-[14px] border border-line bg-white">
            {unenrolled.map((person) => (
              <li className="flex items-center justify-between gap-3 border-b border-divider px-4 py-3 last:border-b-0" key={person.id}>
                <span className="font-bold text-ink">{person.fullName}</span>
                <span className="text-[13px] text-muted">{person.level}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Everyone is on a program.</p>
        )
      ) : shown.length ? (
        <ul className="overflow-hidden rounded-[14px] border border-line bg-white">
          {shown.map((row) => (
            <li className="flex items-center justify-between gap-3 border-b border-divider px-4 py-3 last:border-b-0" key={row.plan.id}>
              <span className="min-w-0">
                <a className="block truncate font-bold text-ink hover:text-blue hover:underline" href={`/manager/team?profile=${row.plan.userId}`}>
                  {row.person?.fullName ?? "Team member"}
                </a>
                <span className="block truncate text-[13px] text-muted">
                  {row.where} · {row.done} of {row.total} steps · {row.progress}% done
                </span>
              </span>
              {row.health === "at_risk" ? (
                <StatusPill tone="danger">{row.overdue} overdue</StatusPill>
              ) : row.health === "not_started" ? (
                <StatusPill tone="neutral">Not started</StatusPill>
              ) : (
                <StatusPill tone="blue">On track</StatusPill>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">{kind === "at_risk" ? "Nobody is behind." : "Nobody is enrolled yet."}</p>
      )}
      {kind !== "unenrolled" && shown.some((row) => shown.filter((other) => other.plan.userId === row.plan.userId).length > 1) ? (
        <p className="text-[13px] text-muted">Some people appear twice because they&apos;re on more than one plan or stage at once.</p>
      ) : null}
    </Drawer>
  );
}
