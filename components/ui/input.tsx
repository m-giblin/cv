import * as React from "react";
import { cn } from "@/lib/utils";

/** Text input: 1.5px ink border, radius 10. Pair with a <label htmlFor>. */
export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-[10px] border-[1.5px] border-ink bg-white px-3 text-[15px] text-ink",
        "placeholder:text-muted focus:border-blue disabled:border-line-strong disabled:bg-surface-2 disabled:text-muted",
        className,
      )}
      {...props}
    />
  );
}
