import * as React from "react";
import { cn } from "@/lib/utils";

const tones = {
 neutral: "border-line-strong text-ink-2",
 blue: "border-blue text-blue",
 success: "border-success text-success bg-success-soft",
 warning: "border-warning text-warning bg-warning-soft",
 danger: "border-danger text-danger bg-danger-soft",
 signal: "border-ink bg-signal text-ink",
};

type TagProps = React.HTMLAttributes<HTMLSpanElement> & {
 tone?: keyof typeof tones;
};

/** Status tags should lead with a symbol (▲ • ● ✓ ◆) so meaning never relies on colour alone. */
export function Tag({ tone = "neutral", className, ...props }: TagProps) {
 return (
 <span
 className={cn(
 "inline-flex items-center gap-1 rounded-full border-[1.5px] px-[9px] py-0.5 font-mono text-xs font-medium uppercase tracking-[0.03em] whitespace-nowrap",
 tones[tone],
 className,
 )}
 {...props}
 />
 );
}
