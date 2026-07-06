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
  const cls = `inline-flex items-center bg-white text-[#334155] border border-[#e2eaf5] text-[11px] font-semibold px-[10px] py-[5px] rounded-md ${className}`;
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
}: {
  accent: string;
  label: string;
  value: string | number;
  sub?: string;
  subColor?: string;
}) {
  return (
    <div
      className="rounded-xl border border-[#e2eaf5] bg-white p-[14px_16px]"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <p className="mb-[8px] text-[10px] font-semibold text-[#64748b]">{label}</p>
      <p className="font-display text-[26px] font-extrabold leading-none text-[#0a1628]">{value}</p>
      {sub ? (
        <p className="mt-[6px] text-[10px] font-semibold" style={{ color: subColor ?? accent }}>
          {sub}
        </p>
      ) : null}
    </div>
  );
}

export function rampPillStyle(progress: number) {
  if (progress >= 100) return { bg: "#dcfce7", color: "#15803d" };
  if (progress >= 55) return { bg: "#dbeafe", color: "#0071ce" };
  return { bg: "#fee2e2", color: "#ef4444" };
}

export function rampBarColor(progress: number) {
  if (progress >= 100) return "#10b981";
  if (progress >= 55) return "#0071ce";
  return "#ef4444";
}

export function simScoreColor(score: number | null) {
  if (score === null) return "#94a3b8";
  if (score >= 80) return "#10b981";
  if (score >= 70) return "#0071ce";
  return "#ef4444";
}

export function simPillStyle(score: number | null) {
  if (score === null) return { bg: "#f1f5f9", color: "#94a3b8" };
  if (score >= 80) return { bg: "#dcfce7", color: "#15803d" };
  if (score >= 70) return { bg: "#dbeafe", color: "#0071ce" };
  return { bg: "#fee2e2", color: "#ef4444" };
}

export function competencyScoreColor(score: number) {
  if (score >= 80) return "#10b981";
  if (score >= 70) return "#0071ce";
  return "#ef4444";
}

export function healthBadgeStyle(health: CoachingHealth) {
  switch (health) {
    case "coach_now":
      return { bg: "#fee2e2", color: "#dc2626", label: "Coach now" };
    case "at_risk":
      return { bg: "#fee2e2", color: "#dc2626", label: "At risk" };
    case "stalled":
      return { bg: "#fef3c7", color: "#b45309", label: "Stalled" };
    case "waiting_on_se":
      return { bg: "#dbeafe", color: "#1d4ed8", label: "Waiting" };
    default:
      return { bg: "#dcfce7", color: "#15803d", label: "On track" };
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
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${sizeCls}`}
      style={{ background: gradient }}
    >
      {initials}
    </div>
  );
}

export const ROSTER_GRID_COLS = "1.6fr 90px 120px 80px 100px 80px 36px";
export const HEATMAP_GRID_COLS = "160px 1fr 1fr 1fr 1fr 1fr 80px";
