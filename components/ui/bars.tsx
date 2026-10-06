import { cn } from "@/lib/utils";

/** 8px score bar with a target tick: danger < 60, warning 60–69, blue ≥ 70. */
export function ScoreBar({ value, target = 70, className }: { value: number; target?: number; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  const fill = v < 60 ? "bg-danger" : v < 70 ? "bg-warning-dot" : "bg-blue";
  return (
    <div aria-label={`${Math.round(v)} of 100, target ${target}`} className={cn("relative h-2 rounded-[4px] bg-[#EAE4DA]", className)} role="img">
      <div className={cn("h-2 rounded-[4px]", fill)} style={{ width: `${v}%` }} />
      <span aria-hidden className="absolute -top-1 h-4 w-0.5 bg-ink" style={{ left: `${target}%` }} />
    </div>
  );
}

/** 26px three-part bar sized by count: under 60, 60–69, 70+. */
export function DistributionBar({ under60, mid, over70, className }: { under60: number; mid: number; over70: number; className?: string }) {
  const parts = [
    { n: under60, cls: "bg-danger text-white", label: `${under60} under 60` },
    { n: mid, cls: "border-[1.5px] border-dashed border-blue bg-white text-blue", label: `${mid}` },
    { n: over70, cls: "bg-blue text-white", label: `${over70} at 70+` },
  ].filter((part) => part.n > 0);
  return (
    <div
      aria-label={`${under60} under 60, ${mid} between 60 and 69, ${over70} at 70 or above`}
      className={cn("flex h-[26px] gap-1", className)}
      role="img"
    >
      {parts.map((part) => (
        <span
          className={cn("flex min-w-[44px] items-center justify-center rounded-[4px] px-2 text-[13px] font-bold whitespace-nowrap", part.cls)}
          key={part.label}
          style={{ flexGrow: part.n }}
        >
          {part.label}
        </span>
      ))}
    </div>
  );
}
