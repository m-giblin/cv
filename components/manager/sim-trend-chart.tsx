import { TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SimTrend } from "@/lib/manager/growth-insights";

export function SimTrendChart({ trend }: { trend: SimTrend }) {
 if (trend.points.length === 0) {
 return (
 <p className="text-sm text-sp-navy-muted">No simulation scores yet — assign practice to establish a baseline.</p>
 );
 }

 const maxScore = Math.max(...trend.points.map((point) => point.score), 100);

 return (
 <div className="space-y-3">
 <div className="flex flex-wrap items-center gap-2">
 <Badge tone={trend.direction === "improving" ? "green" : trend.direction === "declining" ? "amber" : "blue"}>
 {trend.direction === "improving" ? (
 <TrendingUp className="mr-1 inline h-3 w-3" />
 ) : trend.direction === "declining" ? (
 <TrendingDown className="mr-1 inline h-3 w-3" />
 ) : null}
 {trend.directionLabel}
 </Badge>
 {trend.latest !== null ? (
 <span className="text-xs text-sp-navy-muted">
 Latest <strong className="text-sp-navy">{trend.latest}</strong>
 {trend.average !== null ? ` · Avg ${trend.average}` : null}
 </span>
 ) : null}
 </div>

 <div className="flex items-end gap-2">
 {trend.points.map((point, index) => {
 const height = Math.max(12, Math.round((point.score / maxScore) * 72));
 const isLatest = index === trend.points.length - 1;

 return (
 <div className="flex flex-1 flex-col items-center gap-1" key={`${point.date}-${index}`}>
 <span className={`text-[10px] font-bold ${isLatest ? "text-sp-magenta" : "text-sp-navy-muted"}`}>
 {point.score}
 </span>
 <div
 className={`w-full rounded-t-md ${isLatest ? "bg-sp-magenta" : "bg-sp-blue/35"}`}
 style={{ height }}
 title={`${point.label}: ${point.score}`}
 />
 <span className="max-w-full truncate text-[9px] text-sp-navy-muted">{point.label}</span>
 </div>
 );
 })}
 </div>
 </div>
 );
}
