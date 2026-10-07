import * as React from "react";
import { cn } from "@/lib/utils";

type StatProps = {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  noteTone?: "danger" | "warning" | "success" | "muted";
  tone?: "blue" | "danger" | "ink";
  className?: string;
  /** Makes the stat a button that opens the list behind the number. */
  onClick?: () => void;
};

const noteTones = { danger: "text-danger", warning: "text-warning", success: "text-success", muted: "text-muted" };

export function Stat({ label, value, note, noteTone = "muted", tone = "blue", className, onClick }: StatProps) {
  // Clickable stats open the list behind the number.
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      className={cn(
        "flex flex-col gap-1 text-left",
        onClick && "-m-2 cursor-pointer rounded-[10px] p-2 hover:bg-bg focus-visible:outline-2 focus-visible:outline-blue",
        className,
      )}
      onClick={onClick}
      {...(onClick ? { type: "button" as const, "aria-label": `${label}: ${typeof value === "string" || typeof value === "number" ? value : ""}. Show the list.` } : {})}
    >
      <span className="label-caps whitespace-nowrap">{label}</span>
      <span
        className={cn(
          "num text-[40px] leading-none font-extrabold tracking-[-0.03em]",
          tone === "danger" ? "text-danger" : tone === "ink" ? "text-ink" : "text-blue",
        )}
      >
        {value}
      </span>
      {note ? <span className={cn("text-[13px] font-semibold whitespace-nowrap", noteTones[noteTone])}>{note}</span> : null}
      {onClick ? <span className="text-[12px] font-semibold text-blue">View list</span> : null}
    </Tag>
  );
}

/** White card of stats, 48px apart, with an optional primary action on the right. */
export function StatStrip({ children, action, className }: { children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-start gap-x-12 gap-y-4 rounded-[14px] border border-line bg-white px-[22px] py-4", className)}>
      {children}
      {action ? <div className="ml-auto self-center">{action}</div> : null}
    </div>
  );
}
