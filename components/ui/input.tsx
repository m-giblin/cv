import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
 return (
 <input
 className={cn(
 "h-10 w-full border border-[#D4D1CB] bg-white px-3 text-sm text-sp-text-primary",
 "placeholder:text-sp-text-ghost focus:border-sp-blue focus:outline-none",
 className,
 )}
 {...props}
 />
 );
}
