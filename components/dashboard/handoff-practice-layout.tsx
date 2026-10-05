import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Practice page variants. v2 has no per-section accent colours; the accent only picks the eyebrow label. */
export type HandoffPracticeAccent =
 | "market-pulse"
 | "deal-prep"
 | "challenges"
 | "simulations"
 | "pitch"
 | "resources"
 | "flight-check";

const PRACTICE_LABELS: Record<HandoffPracticeAccent, string> = {
 "market-pulse": "Market pulse",
 "deal-prep": "Pre-call prep",
 challenges: "Field scenarios",
 simulations: "AI roleplay",
 pitch: "Self-review",
 resources: "Resources",
 "flight-check": "Flight check",
};

export function HandoffPracticePage({
 accent,
 title,
 description,
 actions,
 children,
 className,
 contentClassName,
}: {
 accent: HandoffPracticeAccent;
 title: string;
 description: string;
 actions?: ReactNode;
 children: ReactNode;
 className?: string;
 contentClassName?: string;
}) {
 const practiceLabel = PRACTICE_LABELS[accent];

 return (
 <div className={cn("handoff-page-enter space-y-5", className)}>
 <header className="mb-1 flex flex-col justify-between gap-4 md:flex-row md:items-end">
 <div>
 <p className="label-mono">Practice · {practiceLabel}</p>
 <h1 className="mt-1 text-[32px] leading-[1.05] font-extrabold tracking-[-0.02em] text-ink">{title}</h1>
 <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">{description}</p>
 </div>
 {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
 </header>
 <div className={cn("space-y-5", contentClassName)}>{children}</div>
 </div>
 );
}

/** Standard handoff card shell: v2 line card (white, 1px line border, radius 14). `accentLeft` is accepted for compatibility but no longer drawn. */
export function HandoffCard({
 children,
 className,
 accentLeft,
}: {
 children: ReactNode;
 className?: string;
 accentLeft?: string;
}) {
 return (
 <div
 className={cn(
 "overflow-hidden rounded-[14px] border border-line bg-white",
 className,
 )}
 data-accent={accentLeft ? "true" : undefined}
 >
 {children}
 </div>
 );
}
