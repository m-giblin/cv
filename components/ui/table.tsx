import * as React from "react";
import { cn } from "@/lib/utils";

/** White card that holds a table and scrolls it sideways inside the card, never the page. */
export function TableCard({ children, className, minWidth = 760 }: { children: React.ReactNode; className?: string; minWidth?: number }) {
  return (
    <div className={cn("overflow-hidden rounded-[14px] border border-line bg-white", className)}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-[15px]" style={{ minWidth }}>
          {children}
        </table>
      </div>
    </div>
  );
}

export const thCls = "th border-b border-line px-5 py-3 text-left align-bottom";
export const tdCls = "border-t border-divider px-5 py-[13px] align-middle";
export const rowHighlight = {
  selected: "bg-blue-soft shadow-[inset_3px_0_0_var(--color-blue)]",
  ready: "bg-signal-soft shadow-[inset_3px_0_0_var(--color-signal)]",
  danger: "bg-danger-row shadow-[inset_3px_0_0_var(--color-danger)]",
};

/** 15/700 title over a 13px muted subline (warning subline replaces it when set). */
export function TwoLineCell({ title, subline, warning }: { title: React.ReactNode; subline?: React.ReactNode; warning?: React.ReactNode }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="truncate text-[15px] font-bold text-ink">{title}</span>
      {warning ? (
        <span className="truncate text-[13px] font-semibold text-warning">{warning}</span>
      ) : subline ? (
        <span className="truncate text-[13px] text-muted">{subline}</span>
      ) : null}
    </span>
  );
}

export function PersonCell({ name, subline, initials }: { name: React.ReactNode; subline?: React.ReactNode; initials: string }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span aria-hidden className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-blue-soft text-[13px] font-bold text-blue">
        {initials}
      </span>
      <TwoLineCell subline={subline} title={name} />
    </span>
  );
}

/** White filter card: dropdowns, a divider, "Show", then count chips. */
export function FilterBar({ children, show, className }: { children?: React.ReactNode; show?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2.5 rounded-[14px] border border-line bg-white px-3.5 py-3", className)}>
      {children}
      {children && show ? <span aria-hidden className="mx-1 h-[26px] w-px bg-line" /> : null}
      {show ? (
        <>
          <span className="label-caps">Show</span>
          {show}
        </>
      ) : null}
    </div>
  );
}
