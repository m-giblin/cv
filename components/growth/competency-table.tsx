import Link from "next/link";
import { Tag } from "@/components/ui/tag";
import { READINESS_TARGET, type CompetencyRow } from "@/lib/se/competency-table";
import { cn } from "@/lib/utils";

const STATUS = {
  needs_practice: { label: "▲ Needs practice", tone: "danger" as const },
  close: { label: "• Close", tone: "warning" as const },
  on_track: { label: "✓ On track", tone: "success" as const },
};

function barColor(score: number) {
  if (score < 60) return "bg-danger";
  if (score < READINESS_TARGET) return "bg-warning";
  return "bg-blue";
}

function Delta({ value }: { value: number | null }) {
  if (value === null) return <span className="font-mono text-xs text-muted">—</span>;
  const text = value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : "±0";
  return (
    <span
      className={cn(
        "font-mono text-xs",
        value > 0 ? "text-success" : value < 0 ? "text-danger" : "text-muted",
      )}
    >
      <span className="sr-only">Four-week change </span>
      {text}
    </span>
  );
}

const CELL = "px-[7px] align-middle first:pl-5 last:pr-5";
const WIDTHS = [undefined, 94, 184, 84, 94, 174, 190];

/** Competency table (artboard 4a): score, bar vs the 70 target, 4-week delta, evidence, status, suggestion. */
export function CompetencyTable({ rows }: { rows: CompetencyRow[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="overflow-x-auto rounded-[14px] border border-line bg-white">
        <table className="w-full min-w-[960px] table-fixed border-collapse text-left">
          <caption className="sr-only">Competency readiness against the target of {READINESS_TARGET}</caption>
          <colgroup>
            {WIDTHS.map((width, index) => (
              <col key={index} style={width ? { width } : undefined} />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b border-line font-mono text-xs font-medium text-muted uppercase">
              {["Competency", "Score", `Vs target │${READINESS_TARGET}`, "4 wk", "Evidence", "Status", "Suggested"].map(
                (label) => (
                  <th className={cn(CELL, "py-2.5 font-medium")} key={label} scope="col">
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const status = STATUS[row.status];
              return (
                <tr className="border-b border-divider text-[15px] last:border-b-0 [&>*]:py-3.5" key={row.name}>
                  <th className={cn(CELL, "font-bold text-ink")} scope="row">
                    {row.name}
                  </th>
                  <td className={cn(CELL, "text-[30px] leading-none font-extrabold tracking-[-0.03em] text-ink")}>{row.score}</td>
                  <td className={CELL}>
                    <span aria-hidden className="relative block h-2 rounded-[4px] bg-divider">
                      <span
                        className={cn("block h-full rounded-[4px]", barColor(row.score))}
                        style={{ width: `${Math.min(100, Math.max(0, row.score))}%` }}
                      />
                      <span
                        className="absolute -top-[3px] -bottom-[3px] w-0.5 bg-ink"
                        style={{ left: `${READINESS_TARGET}%` }}
                      />
                    </span>
                    <span className="sr-only">
                      {row.score} of 100, target {READINESS_TARGET}
                    </span>
                  </td>
                  <td className={CELL}>
                    <Delta value={row.delta} />
                  </td>
                  <td className={cn(CELL, "font-mono text-xs text-ink")}>{row.evidence}</td>
                  <td className={CELL}>
                    <Tag tone={status.tone}>{status.label}</Tag>
                  </td>
                  <td className={CELL}>
                    {row.suggestion ? (
                      <Link className="link text-sm" href={row.suggestion.href}>
                        {row.suggestion.label}
                      </Link>
                    ) : (
                      <span className="font-mono text-xs text-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[13px] text-muted">
        The black tick on each bar marks the {READINESS_TARGET} target. Status is always written out (▲ needs
        practice, • close, ✓ on track) so it never relies on colour alone.
      </p>
    </div>
  );
}

/** Blue gap banner with the single primary action. */
export function GapBanner({ rows }: { rows: CompetencyRow[] }) {
  const below = rows.filter((row) => row.score < READINESS_TARGET);
  const worst = below[0] ?? null;
  return (
    <section
      aria-label="Readiness gaps"
      className="flex flex-wrap items-center justify-between gap-6 rounded-[16px] bg-blue px-6 py-5 text-white"
    >
      <div className="flex items-center gap-5">
        <span className="text-[56px] leading-[0.85] font-extrabold tracking-[-0.04em] text-signal">
          {below.length}
          <span className="text-2xl text-on-blue-muted">/{rows.length}</span>
        </span>
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs font-medium text-signal uppercase">Below target {READINESS_TARGET}</span>
          <span className="text-base leading-[1.45]">
            {worst
              ? `${worst.name} has the biggest gap at ${worst.score}.`
              : "Every competency with evidence is at or above target."}
          </span>
        </div>
      </div>
      {worst?.suggestion ? (
        <Link className="btn-primary whitespace-nowrap" href={worst.suggestion.href}>
          Practice {worst.name.toLowerCase()}
        </Link>
      ) : null}
    </section>
  );
}
