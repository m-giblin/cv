import * as React from "react";
import { cn } from "@/lib/utils";

type StatProps = {
 label: string;
 value: React.ReactNode;
 note?: React.ReactNode;
 noteTone?: "danger" | "muted";
 tone?: "blue" | "danger";
 className?: string;
};

export function Stat({ label, value, note, noteTone = "danger", tone = "blue", className }: StatProps) {
 return (
 <div className={cn("flex flex-col", className)}>
 <span className="label-mono">{label}</span>
 <span
 className={cn(
 "text-[40px] leading-none font-extrabold tracking-[-0.03em]",
 tone === "danger" ? "text-danger" : "text-blue",
 )}
 >
 {value}
 </span>
 {note ? (
 <span className={cn("font-mono text-xs uppercase", noteTone === "danger" ? "text-danger" : "text-muted")}>{note}</span>
 ) : null}
 </div>
 );
}
