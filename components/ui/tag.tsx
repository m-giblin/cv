import * as React from "react";
import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-divider text-ink-2",
  blue: "bg-blue-soft text-blue",
  success: "bg-success-soft text-success",
  warning: "bg-signal-soft text-warning",
  danger: "bg-danger-soft text-danger",
  signal: "bg-signal text-ink",
};

type TagProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: keyof typeof tones;
};

/** v3 Badge: 13/700 pill on a soft fill. For status use StatusPill (dot + word). */
export function Tag({ tone = "neutral", className, ...props }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-bold whitespace-nowrap",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

export { Tag as Badge };
