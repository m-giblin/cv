import { cn } from "@/lib/utils";

export function Progress({
 value,
 className,
}: {
 value: number;
 className?: string;
}) {
 const clamped = Math.max(0, Math.min(100, value));

 return (
 <div className={cn("relative h-[3px] overflow-hidden bg-[#ECEAE6]", className)}>
 <div
 className="absolute left-0 top-0 h-full bg-sp-blue transition-all"
 style={{ width: `${clamped}%` }}
 />
 </div>
 );
}
