import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const SP_CARD =
  "bg-white border border-[#e2eaf5] rounded-xl shadow-[0_1px_4px_rgba(0,20,58,0.04)]";

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
              className="mb-[3px] text-[10.5px] font-bold uppercase tracking-[0.08em]"
              style={{ color: eyebrowColor }}
            >
              {eyebrow}
            </p>
            <h1 className="font-display text-[22px] font-extrabold tracking-[-0.02em] text-[#0a1628]">
              {title}
            </h1>
            {subtitle ? <p className="mt-[3px] text-[12.5px] text-[#64748b]">{subtitle}</p> : null}
          </div>
          {headerRight}
        </div>
      ) : null}
      {fullHeight ? <div className="flex min-h-0 flex-1 flex-col gap-3">{children}</div> : children}
    </div>
  );
}
