import * as React from "react";
import { cn } from "@/lib/utils";

/** Text input: 1px line-strong border, radius 10, blue border on focus. Pair with a <label htmlFor>. */
export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-[10px] border border-line-strong bg-white px-3.5 py-[11px] text-[15px] font-medium text-ink",
        "placeholder:font-normal placeholder:text-[#8A8F9C] focus:border-blue focus:shadow-[0_0_0_3px_var(--color-blue-soft)] focus:outline-none",
        "disabled:border-line disabled:bg-divider disabled:text-muted",
        className,
      )}
      {...props}
    />
  );
}
