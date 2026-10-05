import * as React from "react";
import { cn } from "@/lib/utils";

type ChipProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
 active?: boolean;
};

export function Chip({ active = false, className, type = "button", ...props }: ChipProps) {
 return (
 <button
 type={type}
 aria-pressed={active}
 className={cn(
 "rounded-full px-3.5 py-[7px] font-mono text-xs font-medium uppercase tracking-[0.03em] transition-colors",
 active
 ? "bg-blue text-white"
 : "border-[1.5px] border-line-strong text-ink-2 hover:bg-blue-soft",
 className,
 )}
 {...props}
 />
 );
}
