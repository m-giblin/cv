"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const RING_CIRCUMFERENCE = 251.3;

export function ScoreRing({
 percent,
 size = 76,
 strokeWidth = 9,
 centerValue,
 centerSub,
 className,
 trackClassName = "stroke-white/10",
 progressClassName = "stroke-[#0071ce]",
 labelClassName = "text-white",
 subClassName = "text-white/40",
}: {
 percent: number;
 size?: number;
 strokeWidth?: number;
 centerValue: string;
 centerSub?: string;
 className?: string;
 trackClassName?: string;
 progressClassName?: string;
 labelClassName?: string;
 subClassName?: string;
}) {
 const clamped = Math.min(100, Math.max(0, percent));
 const targetOffset = RING_CIRCUMFERENCE - (clamped / 100) * RING_CIRCUMFERENCE;
 const [offset, setOffset] = useState(RING_CIRCUMFERENCE);

 useEffect(() => {
 const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
 if (reduced) {
 setOffset(targetOffset);
 return;
 }
 const timer = window.setTimeout(() => setOffset(targetOffset), 100);
 return () => window.clearTimeout(timer);
 }, [targetOffset]);

 return (
 <div className={cn("relative shrink-0 text-center", className)} style={{ width: size, height: size }}>
 <svg aria-hidden className="block" height={size} viewBox="0 0 100 100" width={size}>
 <circle
 className={trackClassName}
 cx="50"
 cy="50"
 fill="none"
 r="40"
 strokeWidth={strokeWidth}
 />
 <circle
 className={cn(progressClassName, "transition-[stroke-dashoffset] duration-1000 ease-out")}
 cx="50"
 cy="50"
 fill="none"
 r="40"
 strokeDasharray={RING_CIRCUMFERENCE}
 strokeDashoffset={offset}
 strokeLinecap="round"
 strokeWidth={strokeWidth}
 transform="rotate(-90 50 50)"
 />
 </svg>
 <div className="absolute inset-0 flex flex-col items-center justify-center">
 <span className={cn("font-display text-lg font-extrabold leading-none", labelClassName)}>
 {centerValue}
 </span>
 {centerSub ? (
 <span className={cn("mt-0.5 text-[8.5px]", subClassName)}>{centerSub}</span>
 ) : null}
 </div>
 </div>
 );
}

export function AnimatedProgressFill({
 percent,
 className,
 barClassName = "bg-[#0071ce]",
}: {
 percent: number;
 className?: string;
 barClassName?: string;
}) {
 const clamped = Math.min(100, Math.max(0, percent));
 const [width, setWidth] = useState(0);

 useEffect(() => {
 const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
 if (reduced) {
 setWidth(clamped);
 return;
 }
 const timer = window.setTimeout(() => setWidth(clamped), 100);
 return () => window.clearTimeout(timer);
 }, [clamped]);

 return (
 <div
 className={cn("h-full rounded-full transition-[width] duration-1000 ease-out", barClassName, className)}
 style={{ width: `${width}%` }}
 />
 );
}
