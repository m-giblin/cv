import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "slate" | "blue" | "green" | "amber" | "red" | "purple" | "magenta";
};

const tones = {
  slate: "bg-slate-100 text-sp-navy-muted ring-slate-200/80",
  blue: "bg-sp-blue-soft text-sp-blue-deep ring-sp-blue/15",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  amber: "bg-amber-50 text-amber-800 ring-amber-100",
  red: "bg-red-50 text-red-700 ring-red-100",
  purple: "bg-violet-50 text-violet-700 ring-violet-100",
  magenta: "bg-sp-magenta-soft text-sp-magenta ring-sp-magenta/15",
};

export function Badge({ className, tone = "slate", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
