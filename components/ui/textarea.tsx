import * as React from "react";
import { cn } from "@/lib/utils";

/** Multi-line input: 1.5px ink border, radius 10. Pair with a <label htmlFor>. */
export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-[10px] border-[1.5px] border-ink bg-white px-3 py-2 text-[15px] leading-normal text-ink",
        "placeholder:text-muted focus:border-blue disabled:border-line-strong disabled:bg-surface-2 disabled:text-muted",
        className,
      )}
      {...props}
    />
  );
}
