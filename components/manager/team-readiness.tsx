"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { SimulationAssignForm } from "@/components/manager/simulation-assign-form";
import { Drawer } from "@/components/ui/drawer";
import { DistributionBar } from "@/components/ui/bars";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { TableCard, rowHighlight, tdCls, thCls } from "@/components/ui/table";
import { numberWord, plural } from "@/lib/manager/copy";
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

/** Team › Readiness (10b): one card per competency, worst first. Only the worst gets the primary action. */
export function TeamReadiness({
  rows,
  org,
  tabs,
}: {
  rows: CompetencySeRow[];
  org: Profile[];
  tabs?: ReactNode;
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

  const seCount = rows.length;
  const subtitle =
    seCount > 0 && lines.length > 0
      ? `${numberWord(seCount, true)} ${plural(seCount, "SE", "SEs")}, ${numberWord(lines.length)} ${plural(lines.length, "competency", "competencies")}. Target is ${READINESS_TARGET}.`
      : `Target is ${READINESS_TARGET}.`;

  return (
    <>
      <PageHeader
        accent="Where the team is thin."
        actions={
          <SegmentedToggle
            label="Readiness view"
            onChange={setView}
            options={[
              { id: "cards", label: "Distribution" },
              { id: "table", label: "Table" },
            ]}
            value={view}
          />
        }
        className="pb-[22px]"
        eyebrow="Team"
        subtitle={subtitle}
        title="Readiness."
      />
      {tabs}

      <PageBody className="flex flex-col gap-3 pb-7">
        {lines.length === 0 ? (
          <p className="rounded-[14px] border border-line bg-white px-5 py-10 text-center text-[15px] text-muted">
            No competency scores yet. They appear once simulations, challenges and flight checks are scored.
          </p>
        ) : view === "table" ? (
          <TableCard>
            <caption className="sr-only">Team readiness by competency, worst first</caption>
            <thead>
              <tr>
                {[
                  "Competency",
                  "Team average",
                  `Under ${AT_RISK_READINESS}`,
                  `${AT_RISK_READINESS} to ${READINESS_TARGET - 1}`,
                  `${READINESS_TARGET}+`,
                  `Under ${AT_RISK_READINESS}, by name`,
                ].map((heading, index) => (
                  <th className={cn(thCls, index > 0 && index < 5 && "text-right")} key={heading} scope="col">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr className={line === worst ? rowHighlight.danger : undefined} key={line.name}>
                  <th className={cn(tdCls, "font-bold text-ink")} scope="row">
                    {line.name}
                  </th>
                  <td
                    className={cn(
                      tdCls,
                      "num text-right font-extrabold",
                      line.average < READINESS_TARGET ? "text-danger" : "text-ink",
                    )}
                  >
                    {line.average}
                  </td>
                  <td className={cn(tdCls, "num text-right")}>{line.below.length}</td>
                  <td className={cn(tdCls, "num text-right")}>{line.close}</td>
                  <td className={cn(tdCls, "num text-right")}>{line.atTarget}</td>
                  <td className={cn(tdCls, "text-sm text-ink-2")}>
                    {line.below.length
                      ? line.below.map((entry) => `${entry.fullName} (${entry.score})`).join(", ")
                      : "None"}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableCard>
        ) : (
          lines.map((line) => {
            const isWorst = line === worst;
            return (
              <section
                aria-label={line.name}
                className={cn(
                  "grid grid-cols-1 items-center gap-5 rounded-[14px] border border-line bg-white px-[22px] py-[18px] md:grid-cols-[220px_minmax(0,1fr)_230px] md:gap-7",
                  isWorst && "shadow-[inset_3px_0_0_var(--color-danger)]",
                )}
                key={line.name}
              >
                <div className="flex flex-col gap-1">
                  <h2 className="text-base leading-tight font-extrabold text-ink">{line.name}</h2>
                  <span className="text-sm text-muted">
                    Team average{" "}
                    <b
                      className={cn(
                        "num text-[22px] font-extrabold",
                        line.average < READINESS_TARGET ? "text-danger" : "text-ink",
                      )}
                    >
                      {line.average}
                    </b>
                  </span>
                </div>
                <div className="flex min-w-0 flex-col gap-2">
                  <DistributionBar mid={line.close} over70={line.atTarget} under60={line.below.length} />
                  {line.below.length > 0 ? (
                    <span className="text-[13px] text-ink-2">
                      Under {AT_RISK_READINESS}: {line.below.map((entry) => entry.firstName).join(", ")}
                    </span>
                  ) : null}
                </div>
                <div className="md:justify-self-end">
                  {line.below.length === 0 ? (
                    <span className="text-sm text-muted">No action needed</span>
                  ) : isWorst ? (
                    <button className="btn-primary whitespace-nowrap" onClick={() => setAssigning(line)} type="button">
                      Assign practice to {line.below.length}
                    </button>
                  ) : (
                    <button className="link text-sm" onClick={() => setAssigning(line)} type="button">
                      Assign practice to {line.below.length}
                    </button>
                  )}
                </div>
              </section>
            );
          })
        )}
      </PageBody>

      <Drawer
        onClose={closeDrawer}
        open={assigning !== null}
        title={assigning ? `Assign practice for ${assigning.name}` : "Assign practice"}
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
