import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-xl border border-sp-blue/15 bg-white px-3 text-sm text-sp-navy shadow-sm",
        "placeholder:text-sp-navy-muted/60 focus:border-sp-blue focus:outline-none focus:ring-2 focus:ring-sp-blue/20",
        className,
      )}
      {...props}
    />
  );
}
