import Link from "next/link";
import type { ReactNode } from "react";
import type { CoachingHealth } from "@/lib/manager/se-coaching-summary";
import { avatarGradientForId } from "@/lib/se/avatar-gradients";

/** Amber alert strip — design_handoff_portals/COMPONENT_SPECS.md */
export function ManagerAlertStrip({
  message,
  cta,
  ctaHref,
  accent = "#D4810A",
}: {
  message: ReactNode;
  cta: string;
  ctaHref: string;
  accent?: string;
}) {
  return (
    <div
      className="mb-5 flex items-center justify-between gap-3 border border-t border-b px-[14px] py-[9px]"
      style={{
        borderLeft: `3px solid ${accent}`,
        background: "#FFFBF0",
        borderColor: "rgba(212,129,10,.12)",
        borderLeftColor: accent,
      }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <svg
          className="shrink-0"
          fill="none"
          height="13"
          stroke={accent}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          viewBox="0 0 16 16"
          width="13"
        >
          <path d="M8 2L15 13H1z" />
          <line x1="8" x2="8" y1="7" y2="10" />
          <circle cx="8" cy="11.5" fill={accent} r=".5" stroke="none" />
        </svg>
        <span className="text-[11.5px] font-medium text-[#5C4200]">{message}</span>
      </div>
      <ManagerOutlineBtn className="shrink-0" href={ctaHref}>
        {cta}
      </ManagerOutlineBtn>
    </div>
  );
}

/** 1px grid-line bento container */
export function ManagerBentoGrid({
  children,
  columns,
  className = "",
}: {
  children: ReactNode;
  columns: string;
  className?: string;
}) {
  return (
    <div
      className={`mb-[14px] grid gap-px border border-[#E2DFD9] bg-[#E2DFD9] ${className}`}
      style={{ gridTemplateColumns: columns }}
    >
      {children}
    </div>
  );
}

/** Zone 3 oversized metric — Command Center sidebar */
export function ManagerStatColumn({
  label,
  value,
  sub,
  valueColor = "#0D0E12",
  subColor,
  href,
  highlight = false,
}: {
  label: string;
  value: string | number;
  sub?: string;
  valueColor?: string;
  subColor?: string;
  href?: string;
  highlight?: boolean;
}) {
  const body = (
    <>
      <div className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-[#B0ADA8]">{label}</div>
      <div
        className="font-mono text-[48px] font-normal leading-none tracking-[-0.02em]"
        style={{ color: valueColor }}
      >
        {value}
      </div>
      {sub ? (
        <div className="mt-[5px] font-mono text-[8.5px]" style={{ color: subColor ?? valueColor }}>
          {sub}
        </div>
      ) : null}
    </>
  );

  const className = `border-b border-[#ECEAE6] p-[14px] last:border-b-0 ${highlight ? "bg-[#FEF9F8]" : "bg-[#F9F8F6]"}`;

  if (href) {
    return (
      <Link className={`block transition hover:brightness-[0.98] ${className}`} href={href}>
        {body}
      </Link>
    );
  }

  return <div className={className}>{body}</div>;
}

/** 4-up stat strip — Team Roster */
export function ManagerStatStrip({
  items,
}: {
  items: Array<{
    label: string;
    value: string | number;
    sub?: string;
    valueColor?: string;
    subColor?: string;
    href?: string;
    highlight?: boolean;
  }>;
}) {
  return (
    <div className="mb-[14px] grid grid-cols-4 gap-px border border-[#E2DFD9] bg-[#E2DFD9]">
      {items.map((item) => {
        const inner = (
          <>
            <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.1em] text-[#B0ADA8]">
              {item.label}
            </div>
            <div
              className="font-mono text-[34px] font-normal leading-none"
              style={{ color: item.valueColor ?? "#0D0E12" }}
            >
              {item.value}
            </div>
            {item.sub ? (
              <div className="mt-1 font-mono text-[8.5px]" style={{ color: item.subColor ?? item.valueColor }}>
                {item.sub}
              </div>
            ) : null}
          </>
        );
        const className = `p-[14px_16px] ${item.highlight ? "bg-[#FEF9F8]" : "bg-white"}`;
        if (item.href) {
          return (
            <Link className={`block transition hover:brightness-[0.98] ${className}`} href={item.href} key={item.label}>
              {inner}
            </Link>
          );
        }
        return (
          <div className={className} key={item.label}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}

export function ManagerOutlineBtn({
 children,
 href,
 onClick,
 className = "",
}: {
 children: React.ReactNode;
 href?: string;
 onClick?: () => void;
 className?: string;
}) {
 const cls = `inline-flex items-center bg-white text-[#3D3C38] border border-[#E2DFD9] text-[11px] font-semibold px-[10px] py-[5px] ${className}`;
 if (href) {
 return (
 <Link className={cls} href={href}>
 {children}
 </Link>
 );
 }
 return (
 <button className={cls} onClick={onClick} type="button">
 {children}
 </button>
 );
}

export function ManagerMetricCard({
 accent,
 label,
 value,
 sub,
 subColor,
 href,
}: {
 accent: string;
 label: string;
 value: string | number;
 sub?: string;
 subColor?: string;
 href?: string;
}) {
 const body = (
 <>
 <p className="mb-[8px] font-mono text-[9px] uppercase tracking-[0.1em] text-[#B0ADA8]">{label}</p>
 <p className="font-mono text-[26px] font-medium leading-none text-[#0D0E12]">{value}</p>
 {sub ? (
 <p className="mt-[6px] font-mono text-[8.5px] font-medium" style={{ color: subColor ?? accent }}>
 {sub}
 </p>
 ) : null}
 {href ? (
 <p className="mt-2 text-[10px] font-semibold" style={{ color: accent }}>
 Open inbox →
 </p>
 ) : null}
 </>
 );

 const className =
 "block border border-[#E2DFD9] bg-white p-[14px_16px] transition hover:border-[#0071ce]/35 hover:shadow-sm";

 if (href) {
 return (
 <Link className={className} href={href} style={{ borderLeft: `3px solid ${accent}` }}>
 {body}
 </Link>
 );
 }

 return (
 <div className={className} style={{ borderLeft: `3px solid ${accent}` }}>
 {body}
 </div>
 );
}

export function rampPillStyle(progress: number) {
 if (progress >= 100) return { bg: "#EDFAF3", color: "#0A6E45" };
 if (progress >= 55) return { bg: "#EEF4FF", color: "#0071CE" };
 return { bg: "#FEF0EE", color: "#B83128" };
}

export function rampBarColor(progress: number) {
 if (progress >= 100) return "#0A6E45";
 if (progress >= 55) return "#0071CE";
 return "#B83128";
}

export function simScoreColor(score: number | null) {
 if (score === null) return "#B0ADA8";
 if (score >= 80) return "#0A6E45";
 if (score >= 70) return "#0071CE";
 return "#B83128";
}

export function simPillStyle(score: number | null) {
 if (score === null) return { bg: "#F9F8F6", color: "#B0ADA8" };
 if (score >= 80) return { bg: "#EDFAF3", color: "#0A6E45" };
 if (score >= 70) return { bg: "#EEF4FF", color: "#0071CE" };
 return { bg: "#FEF0EE", color: "#B83128" };
}

export function competencyScoreColor(score: number) {
 if (score >= 80) return "#0A6E45";
 if (score >= 70) return "#0071CE";
 return "#B83128";
}

export function healthBadgeStyle(health: CoachingHealth) {
 switch (health) {
 case "coach_now":
 return { bg: "#FEF0EE", color: "#B83128", label: "Coach now" };
 case "at_risk":
 return { bg: "#FEF0EE", color: "#B83128", label: "At risk" };
 case "stalled":
 return { bg: "#FFFBF0", color: "#D4810A", label: "Stalled" };
 case "waiting_on_se":
 return { bg: "#EEF4FF", color: "#0071CE", label: "Waiting" };
 default:
 return { bg: "#EDFAF3", color: "#0A6E45", label: "On track" };
 }
}

export function SeAvatar({
 id,
 index,
 initials,
 size = "md",
}: {
 id?: string;
 index?: number;
 initials: string;
 size?: "sm" | "md" | "lg";
}) {
 const gradient =
 id != null
 ? avatarGradientForId(id)
 : `linear-gradient(135deg,#0033a1,#0071ce)`;
 const sizeCls =
 size === "sm"
 ? "w-[28px] h-[28px] text-[10px]"
 : size === "lg"
 ? "w-[44px] h-[44px] text-[14px]"
 : "w-[34px] h-[34px] text-[11px]";
 return (
 <div
 className={`flex shrink-0 items-center justify-center rounded-full font-mono font-medium text-white ${sizeCls}`}
 style={{ background: gradient }}
 >
 {initials}
 </div>
 );
}

export const ROSTER_GRID_COLS = "1.6fr 90px 120px 80px 100px 80px 36px";
export const HEATMAP_GRID_COLS = "160px 1fr 1fr 1fr 1fr 1fr 80px";
