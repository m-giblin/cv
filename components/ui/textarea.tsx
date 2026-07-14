import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
 return (
 <textarea
 className={cn(
 "min-h-28 w-full border border-[#D4D1CB] bg-white px-3 py-2 text-sm text-sp-text-primary",
 "placeholder:text-sp-text-ghost focus:border-sp-blue focus:outline-none",
 className,
 )}
 {...props}
 />
 );
}
