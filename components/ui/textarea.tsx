import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-xl border border-sp-blue/15 bg-white px-3 py-2 text-sm text-sp-navy shadow-sm",
        "placeholder:text-sp-navy-muted/60 focus:border-sp-blue focus:outline-none focus:ring-2 focus:ring-sp-blue/20",
        className,
      )}
      {...props}
    />
  );
}
