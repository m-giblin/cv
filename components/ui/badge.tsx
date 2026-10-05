import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "slate" | "blue" | "green" | "amber" | "red" | "purple" | "magenta";
};

/**
 * Legacy badge API mapped onto the v2 Tag look (mono 12, pill, 1.5px border).
 * Prefer `Tag` from components/ui/tag for new code. There are no per-section accent colours,
 * so purple and magenta fold into blue.
 */
const tones = {
  slate: "border-line-strong text-ink-2",
  blue: "border-blue text-blue",
  green: "border-success bg-success-soft text-success",
  amber: "border-warning bg-warning-soft text-warning",
  red: "border-danger bg-danger-soft text-danger",
  purple: "border-blue bg-blue-soft text-blue",
  magenta: "border-blue bg-blue-soft text-blue",
};

export function Badge({ className, tone = "slate", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border-[1.5px] px-[9px] py-0.5 font-mono text-xs font-medium uppercase tracking-[0.03em]",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
