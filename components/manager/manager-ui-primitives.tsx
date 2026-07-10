import Link from "next/link";
import type { CoachingHealth } from "@/lib/manager/se-coaching-summary";
import { avatarGradientForId } from "@/lib/se/avatar-gradients";

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
