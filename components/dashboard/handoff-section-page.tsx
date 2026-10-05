import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type HandoffSectionAccent =
 | "readiness"
 | "workspace"
 | "learning-loop"
 | "assessment"
 | "admin";

const SECTION_EYEBROWS: Record<HandoffSectionAccent, string> = {
 readiness: "Readiness",
 workspace: "Workspace",
 "learning-loop": "Learning loop",
 assessment: "Assessment · Adaptive",
 admin: "Administration",
};

export function HandoffSectionPage({
 accent,
 label,
 title,
 description,
 actions,
 children,
 className,
}: {
 accent: HandoffSectionAccent;
 label?: string;
 title: string;
 description: string;
 actions?: ReactNode;
 children: ReactNode;
 className?: string;
}) {
 const eyebrow = SECTION_EYEBROWS[accent];

 return (
 <div className={cn("handoff-page-enter space-y-5", className)}>
 <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
 <div>
 <p className="label-mono">{label ? `${eyebrow} · ${label}` : eyebrow}</p>
 <h1 className="mt-1 text-[32px] leading-[1.05] font-extrabold tracking-[-0.02em] text-ink">{title}</h1>
 <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">{description}</p>
 </div>
 {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
 </header>
 {children}
 </div>
 );
}

export function HandoffMetricStrip({
 metrics,
}: {
 metrics: Array<{
 label: string;
 value: string;
 sub: string;
 /** Kept for compatibility; v2 has no per-metric accent colours. */
 accent: string;
 valueClassName?: string;
 }>;
}) {
 return (
 <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
 {metrics.map((metric) => (
 <div
 className="rounded-[14px] border border-line bg-white px-4 py-3.5"
 key={metric.label}
 >
 <p className="label-mono mb-1.5">{metric.label}</p>
 <p
 className={cn(
 "text-[26px] font-extrabold leading-none text-ink",
 metric.valueClassName,
 )}
 >
 {metric.value}
 </p>
 <p className="mt-1 text-xs text-muted">{metric.sub}</p>
 </div>
 ))}
 </div>
 );
}
