import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type HandoffSectionAccent =
 | "readiness"
 | "workspace"
 | "learning-loop"
 | "assessment"
 | "admin";

const SECTION_STYLES: Record<HandoffSectionAccent, { eyebrow: string; color: string }> = {
 readiness: { eyebrow: "Readiness", color: "#0071ce" },
 workspace: { eyebrow: "Workspace", color: "#0071ce" },
 "learning-loop": { eyebrow: "Learning loop", color: "#cc27b0" },
 assessment: { eyebrow: "Assessment · Adaptive", color: "#0891b2" },
 admin: { eyebrow: "Administration", color: "#0033a1" },
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
 const style = SECTION_STYLES[accent];

 return (
 <div className={cn("handoff-page-enter space-y-5", className)}>
 <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
 <div>
 <p
 className="text-[10.5px] font-bold uppercase tracking-[0.08em]"
 style={{ color: style.color }}
 >
 {label ? `${style.eyebrow} · ${label}` : style.eyebrow}
 </p>
 <h1 className="sp-page-title mt-1">{title}</h1>
 <p className="sp-page-description mt-1 max-w-3xl">{description}</p>
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
 accent: string;
 valueClassName?: string;
 }>;
}) {
 return (
 <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
 {metrics.map((metric) => (
 <div
 className="border border-[#E2DFD9] bg-white p-[13px_16px] "
 key={metric.label}
 style={{ borderLeft: `3px solid ${metric.accent}` }}
 >
 <p className="mb-1.5 text-[10px] font-semibold text-[#6B6860]">{metric.label}</p>
 <p
 className={cn(
 "font-display text-[26px] font-extrabold leading-none text-[#0D0E12]",
 metric.valueClassName,
 )}
 >
 {metric.value}
 </p>
 <p className="mt-1 text-[10px] text-[#A09D98]">{metric.sub}</p>
 </div>
 ))}
 </div>
 );
}
