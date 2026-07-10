import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
 tone?: "slate" | "blue" | "green" | "amber" | "red" | "purple" | "magenta";
};

const tones = {
 slate: "bg-[#F9F8F6] text-sp-text-muted",
 blue: "bg-sp-blue-soft text-sp-blue",
 green: "bg-[#EDFAF3] text-sp-green",
 amber: "bg-[#FFFBF0] text-sp-amber",
 red: "bg-[#FEF0EE] text-sp-red",
 purple: "bg-[#EDE9FE] text-violet-700",
 magenta: "bg-sp-magenta-soft text-sp-magenta",
};

export function Badge({ className, tone = "slate", ...props }: BadgeProps) {
 return (
 <span
 className={cn(
 "inline-flex items-center px-2 py-0.5 font-mono text-[8px] font-medium uppercase tracking-[0.09em]",
 tones[tone],
 className,
 )}
 {...props}
 />
 );
}
