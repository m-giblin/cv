import * as React from "react";
import { cn } from "@/lib/utils";

/** Multi-line input: 1px line-strong border, radius 10, blue border on focus. Pair with a <label htmlFor>. */
export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-[10px] border border-line-strong bg-white px-3 py-2 text-[15px] leading-normal text-ink",
        "placeholder:text-muted focus:border-blue disabled:border-line disabled:bg-divider disabled:text-muted",
        className,
      )}
      {...props}
    />
  );
}
