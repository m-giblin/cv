"use client";

import { useCallback, useMemo, useState } from "react";
import { SimulationAssignForm } from "@/components/manager/simulation-assign-form";
import { Drawer } from "@/components/ui/drawer";
import { PageHeader } from "@/components/ui/page-header";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { AT_RISK_READINESS, READINESS_TARGET } from "@/lib/manager/team-status";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

export type CompetencySeRow = {
  userId: string;
  fullName: string;
  firstName: string;
  competencySummary: Record<string, number>;
};

type CompetencyLine = {
  name: string;
  average: number;
  scored: number;
  below: { userId: string; firstName: string; fullName: string; score: number }[];
  close: number;
  atTarget: number;
};

function buildLines(rows: CompetencySeRow[]): CompetencyLine[] {
  const byName = new Map<string, { userId: string; firstName: string; fullName: string; score: number }[]>();
  for (const row of rows) {
    for (const [name, raw] of Object.entries(row.competencySummary)) {
      if (!Number.isFinite(raw)) continue;
      const list = byName.get(name) ?? [];
      list.push({ userId: row.userId, firstName: row.firstName, fullName: row.fullName, score: Math.round(raw) });
      byName.set(name, list);
    }
  }
  return [...byName.entries()]
    .map(([name, scores]) => ({
      name,
      average: Math.round(scores.reduce((sum, entry) => sum + entry.score, 0) / scores.length),
      scored: scores.length,
      below: scores.filter((entry) => entry.score < AT_RISK_READINESS).sort((a, b) => a.score - b.score),
      close: scores.filter((entry) => entry.score >= AT_RISK_READINESS && entry.score < READINESS_TARGET).length,
      atTarget: scores.filter((entry) => entry.score >= READINESS_TARGET).length,
    }))
    .sort((a, b) => a.average - b.average || b.below.length - a.below.length);
}

function DistributionBar({ line }: { line: CompetencyLine }) {
  const pct = (n: number) => `${(n / line.scored) * 100}%`;
  const label = `${line.below.length} below ${AT_RISK_READINESS}, ${line.close} between ${AT_RISK_READINESS} and ${READINESS_TARGET - 1}, ${line.atTarget} at ${READINESS_TARGET} or above`;
  const segment = "flex items-center overflow-hidden rounded-[5px] pl-2 font-mono text-xs whitespace-nowrap uppercase";
  return (
    <div aria-label={label} className="flex h-6 gap-1" role="img">
      {line.below.length > 0 ? (
        <span className={cn(segment, "bg-danger text-white")} style={{ width: pct(line.below.length) }}>
          ▲ {line.below.length}
        </span>
      ) : null}
      {line.close > 0 ? (
        <span className={cn(segment, "border-[1.5px] border-dashed border-blue text-blue")} style={{ width: pct(line.close) }}>
          • {line.close}
        </span>
      ) : null}
      {line.atTarget > 0 ? (
        <span className={cn(segment, "bg-blue text-white")} style={{ width: pct(line.atTarget) }}>
          ✓ {line.atTarget} at {READINESS_TARGET}+
        </span>
      ) : null}
    </div>
  );
}

/** Team › Readiness: one line card per competency, worst first, with a single primary action. */
export function TeamReadiness({
  rows,
  org,
}: {
  rows: CompetencySeRow[];
  org: Profile[];
}) {
  const [view, setView] = useState("cards");
  const [assigning, setAssigning] = useState<CompetencyLine | null>(null);
  const lines = useMemo(() => buildLines(rows), [rows]);
  const worst = lines.find((line) => line.below.length > 0) ?? null;
  const closeDrawer = useCallback(() => setAssigning(null), []);

  const assignees = useMemo(() => {
    if (!assigning) return [];
    const ids = new Set(assigning.below.map((entry) => entry.userId));
    return org.filter((profile) => ids.has(profile.id));
  }, [assigning, org]);

  return (
    <>
      <PageHeader
        actions={
          <div className="flex flex-wrap items-center gap-5">
            <p aria-label="Legend" className="flex gap-4 font-mono text-xs text-ink-2 uppercase">
              <span>▲ Below {AT_RISK_READINESS}</span>
              <span>
                • {AT_RISK_READINESS}–{READINESS_TARGET - 1}
              </span>
              <span>✓ {READINESS_TARGET}+</span>
            </p>
            <SegmentedToggle
              label="Readiness view"
              onChange={setView}
              options={[
                { id: "cards", label: "Cards" },
                { id: "table", label: "Table" },
              ]}
              value={view}
            />
          </div>
        }
        className="pb-3.5"
        eyebrow={`Readiness by competency · ${rows.length} SE${rows.length === 1 ? "" : "s"} · target ${READINESS_TARGET}`}
        title="Team"
      />

      <div className="flex flex-col gap-2.5 px-[var(--gutter)] pt-[18px] pb-7">
        {lines.length === 0 ? (
          <p className="rounded-[14px] border border-line bg-white px-5 py-10 text-center text-[15px] text-muted">
            No competency scores yet. They appear once simulations, challenges and Flight Checks are scored.
          </p>
        ) : view === "table" ? (
          <div className="overflow-x-auto rounded-[14px] border border-line bg-white">
            <table className="w-full min-w-[760px] border-collapse text-left text-[15px]">
              <caption className="sr-only">Team readiness by competency, worst first</caption>
              <thead className="bg-blue font-mono text-xs text-white uppercase">
                <tr>
                  {["Competency", "Team average", `Below ${AT_RISK_READINESS}`, `${AT_RISK_READINESS}–${READINESS_TARGET - 1}`, `${READINESS_TARGET}+`, `Names below ${AT_RISK_READINESS}`].map(
                    (heading) => (
                      <th className="px-5 py-[11px] font-medium" key={heading} scope="col">
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr className="border-b border-divider last:border-b-0" key={line.name}>
                    <th className="px-5 py-3 font-bold text-ink" scope="row">
                      {line.name}
                    </th>
                    <td className={cn("px-5 py-3 font-extrabold", line.average < READINESS_TARGET ? "text-danger" : "text-blue")}>
                      {line.average}
                    </td>
                    <td className="px-5 py-3">{line.below.length}</td>
                    <td className="px-5 py-3">{line.close}</td>
                    <td className="px-5 py-3">{line.atTarget}</td>
                    <td className="px-5 py-3 text-ink-2">
                      {line.below.length
                        ? line.below.map((entry) => `${entry.fullName} (${entry.score})`).join(", ")
                        : "None"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          lines.map((line) => (
            <section
              aria-label={line.name}
              className="grid grid-cols-1 items-center gap-5 rounded-[14px] border border-line bg-white px-5 py-4 md:grid-cols-[220px_minmax(0,1fr)_210px]"
              key={line.name}
            >
              <div className="flex items-baseline gap-3">
                <span
                  className={cn(
                    "text-[34px] leading-none font-extrabold tracking-[-0.03em]",
                    line.average < READINESS_TARGET ? "text-danger" : "text-blue",
                  )}
                >
                  {line.average}
                </span>
                <h2 className="text-[15px] leading-[1.2] font-bold text-ink">{line.name}</h2>
              </div>
              <div className="flex flex-col gap-2">
                <DistributionBar line={line} />
                <div className="flex flex-wrap gap-1.5">
                  {line.below.length === 0 ? (
                    <span className="label-mono">No one below {AT_RISK_READINESS}</span>
                  ) : (
                    line.below.map((entry) => (
                      <span
                        className="rounded-full border-[1.5px] border-danger px-[9px] py-0.5 font-mono text-xs text-danger uppercase"
                        key={entry.userId}
                        title={entry.fullName}
                      >
                        {entry.firstName} {entry.score}
                      </span>
                    ))
                  )}
                </div>
              </div>
              <div className="md:justify-self-end">
                {line.below.length === 0 ? (
                  <span className="label-mono">No action needed</span>
                ) : line === worst ? (
                  <button className="btn-primary !px-[18px] !py-[9px] !text-sm" onClick={() => setAssigning(line)} type="button">
                    Assign practice to {line.below.length}
                  </button>
                ) : (
                  <button className="link text-sm" onClick={() => setAssigning(line)} type="button">
                    Assign practice to {line.below.length}
                  </button>
                )}
              </div>
            </section>
          ))
        )}
      </div>

      <Drawer
        onClose={closeDrawer}
        open={assigning !== null}
        title={assigning ? `Assign practice · ${assigning.name}` : "Assign practice"}
      >
        {assigning ? (
          <div className="flex flex-col gap-4">
            <p className="text-[15px] text-ink-2">
              {assigning.below.length === 1 ? "This SE scores" : "These SEs score"} below {AT_RISK_READINESS} on{" "}
              {assigning.name}. Pick a simulation to send them.
            </p>
            <SimulationAssignForm
              assignees={assignees}
              fixedAssigneeIds={assignees.map((profile) => profile.id)}
              onAssigned={closeDrawer}
              teamAssignees={org}
            />
          </div>
        ) : null}
      </Drawer>
    </>
  );
}
