import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "slate" | "blue" | "green" | "amber" | "red" | "purple" | "magenta";
};

/**
 * Legacy badge API mapped onto the v3 badge: 13/700, pill, 4px 12px, soft fill, no border.
 * Prefer `Tag` from components/ui/tag for new code. There are no per-section accent colours,
 * so purple and magenta fold into blue.
 */
const tones = {
  slate: "bg-divider text-ink-2",
  blue: "bg-blue-soft text-blue",
  green: "bg-success-soft text-success",
  amber: "bg-signal-soft text-warning",
  red: "bg-danger-soft text-danger",
  purple: "bg-blue-soft text-blue",
  magenta: "bg-blue-soft text-blue",
};

export function Badge({ className, tone = "slate", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1 text-[13px] leading-none font-bold",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
