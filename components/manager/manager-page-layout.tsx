import type { ReactNode } from "react";

/** Manager route page shell — MANAGER_TSX_COMPONENTS.md */
export function ManagerPageLayout({
  eyebrow,
  eyebrowColor = "#0071ce",
  title,
  subtitle,
  children,
  headerRight,
}: {
  eyebrow: string;
  eyebrowColor?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  headerRight?: ReactNode;
}) {
  return (
    <div className="anim-in p-[22px_24px_28px]">
      <div className="mb-[16px] flex items-start justify-between gap-4">
        <div>
          <p
            className="mb-[3px] text-[10.5px] font-bold uppercase tracking-[0.08em]"
            style={{ color: eyebrowColor }}
          >
            {eyebrow}
          </p>
          <h1 className="font-display text-[22px] font-extrabold tracking-[-0.02em] text-[#0a1628]">{title}</h1>
          {subtitle ? <p className="mt-[3px] text-[12.5px] text-[#64748b]">{subtitle}</p> : null}
        </div>
        {headerRight}
      </div>
      {children}
    </div>
  );
}

export const MANAGER_SECTION_HEADERS: Record<
  string,
  { eyebrow: string; eyebrowColor?: string; title: string; subtitle: string }
> = {
  command: {
    eyebrow: "Team oversight",
    title: "Command Center",
    subtitle: "At-a-glance team health, pending reviews, and coaching priorities",
  },
  inbox: {
    eyebrow: "Action required",
    eyebrowColor: "#d97706",
    title: "Action Inbox",
    subtitle: "Challenges, simulations, certifications, and deal prep waiting for your review",
  },
  roster: {
    eyebrow: "Your team",
    title: "Team Roster",
    subtitle: "Ramp progress, sim scores, and readiness at a glance",
  },
  readiness: {
    eyebrow: "Field readiness",
    eyebrowColor: "#0891b2",
    title: "Readiness Map",
    subtitle: "Competency heatmap and coaching focus recommendations",
  },
  cadence: {
    eyebrow: "Coaching rhythm",
    eyebrowColor: "#cc27b0",
    title: "Coaching Cadence",
    subtitle: "Per-SE touchpoints, sim trends, and next coaching actions",
  },
  dev: {
    eyebrow: "Annual development",
    title: "Development Plans",
    subtitle: "Quarterly attestations and goal progress across your team",
  },
};
