import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Accent colors per design handoff practice pages (SE Experience v2.dc.html). */
export type HandoffPracticeAccent =
  | "market-pulse"
  | "deal-prep"
  | "challenges"
  | "simulations"
  | "pitch"
  | "resources"
  | "flight-check";

const ACCENT_COLORS: Record<HandoffPracticeAccent, string> = {
  "market-pulse": "#0071ce",
  "deal-prep": "#d97706",
  challenges: "#7c3aed",
  simulations: "#cc27b0",
  pitch: "#be185d",
  resources: "#0071ce",
  "flight-check": "#10b981",
};

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
  const eyebrowColor = ACCENT_COLORS[accent];
  const practiceLabel = PRACTICE_LABELS[accent];

  return (
    <div className={cn("handoff-page-enter space-y-5", className)}>
      <header className="mb-1 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p
            className="text-[10.5px] font-bold uppercase tracking-[0.08em]"
            style={{ color: eyebrowColor }}
          >
            Practice · {practiceLabel}
          </p>
          <h1 className="sp-page-title mt-1">{title}</h1>
          <p className="sp-page-description mt-1 max-w-3xl">{description}</p>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </header>
      <div className={cn("space-y-5", contentClassName)}>{children}</div>
    </div>
  );
}

/** Standard handoff card shell — white, 12px radius, design shadow. */
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
        "overflow-hidden rounded-xl border border-[#e2eaf5] bg-white shadow-[0_1px_4px_rgba(0,20,58,0.04)]",
        className,
      )}
      style={accentLeft ? { borderLeft: `3px solid ${accentLeft}` } : undefined}
    >
      {children}
    </div>
  );
}
