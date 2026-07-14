import type { ReactNode } from "react";

/** Manager route page shell — design_handoff_portals v4 */
export function ManagerPageLayout({
  eyebrow,
  eyebrowColor = "#0071ce",
  title,
  subtitle,
  children,
  headerRight,
  bleed = false,
  compact = false,
}: {
  eyebrow: string;
  eyebrowColor?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  headerRight?: ReactNode;
  /** Full-bleed child (edge-to-edge within page padding) */
  bleed?: boolean;
  /** Tighter header + less vertical padding (Readiness Map) */
  compact?: boolean;
}) {
  return (
    <div className={compact ? "anim-in px-[22px] pb-6 pt-3" : "anim-in p-[22px_22px_34px]"}>
      <div className={`flex items-start justify-between gap-4 ${compact ? "mb-2" : "mb-5"}`}>
        <div className="border-l-[3px] pl-[14px]" style={{ borderColor: eyebrowColor }}>
          <p
            className={`font-mono font-medium uppercase tracking-[0.16em] text-[#A09D98] ${
              compact ? "mb-0.5 text-[8px]" : "mb-[5px] text-[8.5px]"
            }`}
          >
            {eyebrow}
          </p>
          <h1
            className={`font-display font-extrabold leading-none tracking-[-0.035em] text-[#0D0E12] ${
              compact ? "text-[22px]" : "text-[30px]"
            }`}
          >
            {title}
          </h1>
          {subtitle ? (
            <p className={`text-[#6B6860] ${compact ? "mt-0.5 text-[11px] leading-snug" : "mt-1 text-[12px]"}`}>
              {subtitle}
            </p>
          ) : null}
        </div>
        {headerRight}
      </div>
      <div className={bleed ? "-mx-[22px]" : undefined}>{children}</div>
    </div>
  );
}

export const MANAGER_SECTION_HEADERS: Record<
  string,
  { eyebrow: string; eyebrowColor?: string; title: string; subtitle: string; bleed?: boolean; compact?: boolean }
> = {
  command: {
    eyebrow: "Team oversight",
    title: "Command Center",
    subtitle: "At-a-glance team health, pending reviews, and coaching priorities",
  },
  inbox: {
    eyebrow: "Action required",
    eyebrowColor: "#d4810a",
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
    eyebrowColor: "#cc27b0",
    title: "Readiness Map",
    subtitle: "Weekly coaching intelligence — who needs you, on what, and what to do next",
    compact: true,
  },
  cadence: {
    eyebrow: "Coaching rhythm",
    eyebrowColor: "#cc27b0",
    title: "Coaching Cadence",
    subtitle: "Per-SE touchpoints, sim trends, and next coaching actions",
    compact: true,
  },
  dev: {
    eyebrow: "Development",
    eyebrowColor: "#0071ce",
    title: "AI Growth Plans",
    subtitle: "AI-generated development goals, approvals, and content gap requests",
    compact: true,
    bleed: true,
  },
  program: {
    eyebrow: "Onboarding program",
    eyebrowColor: "#0071ce",
    title: "Program Tracker",
    subtitle: "Ramp stage completion and per-SE plan progress",
    compact: true,
  },
  assign: {
    eyebrow: "Ramp assignments",
    eyebrowColor: "#0071ce",
    title: "Assign Plans",
    subtitle: "Assign week-based templates and monitor active onboarding plans",
  },
  mentees: {
    eyebrow: "Mentor workspace",
    eyebrowColor: "#5b21b6",
    title: "My Mentees",
    subtitle: "Ramp plans and coaching notes for SEs assigned to you as mentor",
  },
  leaderboard: {
    eyebrow: "Team competition",
    eyebrowColor: "#d97706",
    title: "Leaderboard",
    subtitle: "Points from trophies, sim scores, and weekly practice streaks",
  },
  history: {
    eyebrow: "Coaching archive",
    title: "Review History",
    subtitle: "Past sign-offs, challenge reviews, and coaching notes",
  },
};
