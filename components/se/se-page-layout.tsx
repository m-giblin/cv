import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const SP_CARD =
 "bg-white border border-[#E2DFD9] ";

export function SEPageLayout({
 eyebrow,
 eyebrowColor = "#0071ce",
 title,
 subtitle,
 children,
 headerRight,
 bare = false,
 fullHeight = false,
 className,
}: {
 eyebrow?: string;
 eyebrowColor?: string;
 title?: string;
 subtitle?: string;
 children: ReactNode;
 headerRight?: ReactNode;
 /** Workspace-style pages: padding only, no page header */
 bare?: boolean;
 /** Challenges-style pages: flex column, full height */
 fullHeight?: boolean;
 className?: string;
}) {
 return (
 <div
 className={cn(
 "anim-in px-[26px] pb-7 pt-[22px]",
 fullHeight && "flex h-full min-h-0 flex-col overflow-hidden pb-0",
 className,
 )}
 >
 {!bare && eyebrow && title ? (
 <div className="mb-[18px] flex items-start justify-between gap-4">
 <div>
        <p
          className="mb-[3px] font-mono text-[9px] font-medium uppercase tracking-[0.1em]"
          style={{ color: eyebrowColor }}
        >
 {eyebrow}
 </p>
 <h1 className="font-display text-[22px] font-extrabold tracking-[-0.02em] text-[#0D0E12]">
 {title}
 </h1>
 {subtitle ? <p className="mt-[3px] text-[12.5px] text-[#6B6860]">{subtitle}</p> : null}
 </div>
 {headerRight}
 </div>
 ) : null}
 {fullHeight ? <div className="flex min-h-0 flex-1 flex-col gap-3">{children}</div> : children}
 </div>
 );
}
