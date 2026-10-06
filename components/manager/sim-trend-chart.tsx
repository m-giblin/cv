import { StatusPill } from "@/components/ui/status-pill";
import type { SimTrend } from "@/lib/manager/growth-insights";

const BLUE = "#0033A1";
const DANGER = "#B42318";
const WARNING_DOT = "#E0A21A";
const TRACK = "#EFEAE2";

function scoreTone(score: number) {
  if (score < 60) return "text-danger";
  if (score < 70) return "text-warning";
  return "text-blue";
}

function pointColor(score: number) {
  if (score < 60) return DANGER;
  if (score < 70) return WARNING_DOT;
  return BLUE;
}

const WIDTH = 320;
const HEIGHT = 96;
const PAD_Y = 10;

/** Last six simulation scores as a blue line; points coloured by score band. */
export function SimTrendChart({ trend }: { trend: SimTrend }) {
  if (trend.points.length === 0) {
    return <p className="text-sm text-muted">No simulation scores yet. Assign practice to set a baseline.</p>;
  }

  const count = trend.points.length;
  // Points sit at the centre of each label column below, so labels line up with them.
  const x = (index: number) => ((index + 0.5) * WIDTH) / count;
  const y = (score: number) => PAD_Y + ((100 - Math.max(0, Math.min(100, score))) * (HEIGHT - PAD_Y * 2)) / 100;
  const path = trend.points.map((point, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(point.score)}`).join(" ");

  const directionTone =
    trend.direction === "improving" ? "success" : trend.direction === "declining" ? "warning" : "blue";

  const summary = trend.points.map((point) => `${point.label} ${point.score}`).join(", ");

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <StatusPill tone={directionTone}>{trend.directionLabel}</StatusPill>
        {trend.latest !== null ? (
          <span className="text-[13px] text-muted">
            Latest{" "}
            <strong className={`num text-[15px] font-extrabold tracking-[-0.03em] ${scoreTone(trend.latest)}`}>
              {trend.latest}
            </strong>
            {trend.average !== null ? (
              <>
                , average <span className="num font-semibold text-ink-2">{trend.average}</span>
              </>
            ) : null}
          </span>
        ) : null}
      </div>

      <svg
        aria-label={`Simulation scores, oldest to newest: ${summary}`}
        className="h-auto w-full overflow-visible"
        role="img"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      >
        {[100, 70, 60, 0].map((mark) => (
          <line
            key={mark}
            stroke={TRACK}
            strokeDasharray={mark === 70 ? "4 3" : undefined}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            x1={0}
            x2={WIDTH}
            y1={y(mark)}
            y2={y(mark)}
          />
        ))}
        <path d={path} fill="none" stroke={BLUE} strokeLinejoin="round" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        {trend.points.map((point, index) => (
          <circle
            cx={x(index)}
            cy={y(point.score)}
            fill={index === count - 1 ? pointColor(point.score) : "#FFFFFF"}
            key={`${point.date}-${index}`}
            r={4}
            stroke={pointColor(point.score)}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          >
            <title>{`${point.label}: ${point.score}`}</title>
          </circle>
        ))}
      </svg>

      <div aria-hidden className="flex">
        {trend.points.map((point, index) => (
          <span className="flex min-w-0 flex-1 flex-col items-center px-0.5" key={`${point.date}-${index}-label`}>
            <span className={`num text-[13px] font-bold ${scoreTone(point.score)}`}>{point.score}</span>
            <span className="w-full truncate text-center text-xs text-muted" title={point.label}>
              {point.label}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
