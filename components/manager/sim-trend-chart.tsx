import { Tag } from "@/components/ui/tag";
import type { SimTrend } from "@/lib/manager/growth-insights";

function scoreTone(score: number) {
 if (score < 60) return "text-danger";
 if (score < 70) return "text-warning";
 return "text-blue";
}

export function SimTrendChart({ trend }: { trend: SimTrend }) {
 if (trend.points.length === 0) {
 return (
 <p className="text-sm text-muted">No simulation scores yet — assign practice to establish a baseline.</p>
 );
 }

 const maxScore = Math.max(...trend.points.map((point) => point.score), 100);

 const tag =
 trend.direction === "improving" ? (
 <Tag tone="success">▲ {trend.directionLabel}</Tag>
 ) : trend.direction === "declining" ? (
 <Tag tone="warning">▼ {trend.directionLabel}</Tag>
 ) : (
 <Tag tone="blue">• {trend.directionLabel}</Tag>
 );

 return (
 <div className="min-w-0 space-y-3">
 <div className="flex flex-wrap items-center gap-2">
 {tag}
 {trend.latest !== null ? (
 <span className="text-sm text-muted">
 Latest{" "}
 <strong className={`font-extrabold tracking-[-0.03em] ${scoreTone(trend.latest)}`}>
 {trend.latest}
 </strong>
 {trend.average !== null ? ` · Avg ${trend.average}` : null}
 </span>
 ) : null}
 </div>

 <div className="flex items-end gap-1.5 border-b border-line">
 {trend.points.map((point, index) => {
 const height = Math.max(12, Math.round((point.score / maxScore) * 72));
 const isLatest = index === trend.points.length - 1;

 return (
 <div className="flex min-w-0 flex-1 flex-col items-center gap-1" key={`${point.date}-${index}`}>
 <span
 className={`text-xs font-extrabold tracking-[-0.03em] ${isLatest ? scoreTone(point.score) : "text-muted"}`}
 >
 {point.score}
 </span>
 <div
 className={`w-full rounded-t-[4px] ${isLatest ? "bg-blue" : "bg-blue-soft"}`}
 style={{ height }}
 title={`${point.label}: ${point.score}`}
 />
 </div>
 );
 })}
 </div>
 <div className="flex gap-1.5">
 {trend.points.map((point, index) => (
 <span
 className="min-w-0 flex-1 truncate text-center font-mono text-xs text-muted"
 key={`${point.date}-${index}-label`}
 title={point.label}
 >
 {point.label}
 </span>
 ))}
 </div>
 </div>
 );
}
