import * as React from "react";
import { cn } from "@/lib/utils";

/** Text input: 1px line-strong border, radius 10, blue border on focus. Pair with a <label htmlFor>. */
export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-[10px] border border-line-strong bg-white px-3 text-[15px] text-ink",
        "placeholder:text-muted focus:border-blue disabled:border-line disabled:bg-divider disabled:text-muted",
        className,
      )}
      {...props}
    />
  );
}
