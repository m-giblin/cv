import Link from "next/link";
import { ScoreBar } from "@/components/ui/bars";
import { GapBanner as NavyGapBanner } from "@/components/ui/editorial";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { TableCard, tdCls, thCls } from "@/components/ui/table";
import { READINESS_TARGET, type CompetencyRow } from "@/lib/se/competency-table";
import { cn } from "@/lib/utils";

const STATUS: Record<CompetencyRow["status"], { label: string; tone: StatusTone }> = {
  needs_practice: { label: "Needs practice", tone: "danger" },
  close: { label: "Close", tone: "warning" },
  on_track: { label: "On track", tone: "success" },
};

function scoreColor(score: number) {
  if (score < 60) return "text-danger";
  if (score < READINESS_TARGET) return "text-warning";
  return "text-blue";
}

function Delta({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <span className="text-sm text-muted">
        <span aria-hidden>–</span>
        <span className="sr-only">No change data yet</span>
      </span>
    );
  }
  const text = value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : "0";
  return (
    <span
      className={cn(
        "num text-sm font-semibold",
        value > 0 ? "text-success" : value < 0 ? "text-danger" : "text-muted",
      )}
    >
      <span className="sr-only">Four-week change </span>
      {text}
    </span>
  );
}

/** Competency table (artboard 4a): score, bar against the 70 target, 4-week change, evidence, status, suggestion. */
export function CompetencyTable({ rows }: { rows: CompetencyRow[] }) {
  return (
    <div className="flex flex-col gap-3">
      <TableCard minWidth={900}>
        <caption className="sr-only">Competency readiness against the target of {READINESS_TARGET}</caption>
        <thead>
          <tr>
            <th className={thCls} scope="col">
              Competency
            </th>
            <th className={cn(thCls, "w-[80px]")} scope="col">
              Score
            </th>
            <th className={cn(thCls, "w-[24%]")} scope="col">
              Against target {READINESS_TARGET}
            </th>
            <th className={cn(thCls, "w-[70px]")} scope="col">
              4 wks
            </th>
            <th className={cn(thCls, "w-[100px]")} scope="col">
              Evidence
            </th>
            <th className={cn(thCls, "w-[150px]")} scope="col">
              Status
            </th>
            <th className={cn(thCls, "w-[170px] text-right")} scope="col">
              Suggested
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const status = STATUS[row.status];
            const cell = cn(tdCls, "py-4", index === 0 && "border-t-0");
            return (
              <tr key={row.name}>
                <th className={cn(cell, "text-[15px] font-bold text-ink")} scope="row">
                  {row.name}
                </th>
                <td className={cn(cell, "num text-[28px] leading-none font-extrabold tracking-[-0.03em]", scoreColor(row.score))}>
                  {row.score}
                </td>
                <td className={cell}>
                  <ScoreBar target={READINESS_TARGET} value={row.score} />
                </td>
                <td className={cell}>
                  <Delta value={row.delta} />
                </td>
                <td className={cn(cell, "text-sm text-ink-2")}>
                  {row.evidence} {row.evidence === 1 ? "item" : "items"}
                </td>
                <td className={cell}>
                  <StatusPill tone={status.tone}>{status.label}</StatusPill>
                </td>
                <td className={cn(cell, "text-right")}>
                  {row.suggestion ? (
                    <Link className="link text-sm" href={row.suggestion.href}>
                      {row.suggestion.label}
                    </Link>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </TableCard>
      <p className="text-[13px] text-muted">
        Scores blend your last scored simulations and reviewed challenges. The tick on each bar marks the target of{" "}
        {READINESS_TARGET}.
      </p>
    </div>
  );
}

/** Navy gap banner with the page's one primary action. */
export function GapBanner({ rows }: { rows: CompetencyRow[] }) {
  const below = rows.filter((row) => row.score < READINESS_TARGET).sort((a, b) => a.score - b.score);
  const worst = below[0] ?? null;
  return (
    <NavyGapBanner
      action={
        worst?.suggestion ? (
          <Link className="btn-primary whitespace-nowrap" href={worst.suggestion.href}>
            Practice {worst.name.toLowerCase()}
          </Link>
        ) : undefined
      }
      of={rows.length}
      title={
        below.length === 1
          ? `competency is below the target of ${READINESS_TARGET}.`
          : `competencies are below the target of ${READINESS_TARGET}.`
      }
      value={below.length}
    >
      {worst
        ? `${worst.name} is furthest behind at ${worst.score}. ${worst.suggestion ? `Suggested next: ${worst.suggestion.label}.` : ""}`
        : "Every competency with evidence is at or above target. Keep the streak going in Practice."}
    </NavyGapBanner>
  );
}
