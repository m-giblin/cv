import * as React from "react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
 eyebrow?: string;
 title: React.ReactNode;
 /** Single primary action or a stats group. */
 actions?: React.ReactNode;
 className?: string;
};

export function PageHeader({ eyebrow, title, actions, className }: PageHeaderProps) {
 return (
 <header
 className={cn(
 "flex flex-wrap items-end justify-between gap-6 px-[var(--gutter)] pt-6 pb-[18px]",
 className,
 )}
 >
 <div className="min-w-0">
 {eyebrow ? <p className="label-mono">{eyebrow}</p> : null}
 <h1 className="mt-1 text-[32px] leading-[1.05] font-extrabold tracking-[-0.02em] text-ink">
 {title}
 </h1>
 </div>
 {actions ? <div className="flex flex-wrap items-center gap-4">{actions}</div> : null}
 </header>
 );
}
