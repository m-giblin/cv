import { cn } from "@/lib/utils";
import { SP } from "@/lib/design/tokens";

export function BentoGrid({
 columns,
 children,
 className,
}: {
 columns: string;
 children: React.ReactNode;
 className?: string;
}) {
 return (
 <div
 className={cn("grid gap-px", className)}
 style={{ gridTemplateColumns: columns, background: SP.border }}
 >
 {children}
 </div>
 );
}

export function BentoCell({
 children,
 className,
 variant = "primary",
}: {
 children: React.ReactNode;
 className?: string;
 variant?: "primary" | "secondary";
}) {
 return (
 <div
 className={cn(variant === "secondary" ? "bg-[#F9F8F6]" : "bg-white", className)}
 >
 {children}
 </div>
 );
}
