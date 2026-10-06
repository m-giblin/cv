import * as React from "react";
import { cn } from "@/lib/utils";

type ChipProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  count?: number | string;
};

/** Count chip: pill, ink when active. */
export function Chip({ active = false, count, className, type = "button", children, ...props }: ChipProps) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3.5 py-[7px] text-sm font-semibold whitespace-nowrap transition-colors",
        active ? "bg-ink text-white" : "border border-line bg-white text-ink hover:border-line-strong",
        className,
      )}
      type={type}
      {...props}
    >
      {children}
      {count !== undefined ? (
        <span className={cn("num font-medium", active ? "text-[#C9CEDA]" : "text-muted")}>{count}</span>
      ) : null}
    </button>
  );
}

export { Chip as CountChip };
