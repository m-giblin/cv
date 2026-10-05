import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ScheduleRow = {
  id: string;
  day: string;
  month: string;
  title: ReactNode;
  meta?: ReactNode;
  gate?: boolean;
};

/** Blue list of dated rows. Gate rows get a signal date chip. */
export function Schedule({ rows, className }: { rows: ScheduleRow[]; className?: string }) {
  return (
    <ul className={cn("flex flex-col gap-0.5 rounded-[14px] bg-blue p-1.5", className)}>
      {rows.map((row) => (
        <li
          className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] px-2 py-1.5"
          key={row.id}
        >
          <span
            className={cn(
              "grid h-12 w-12 place-content-center rounded-[10px] text-center",
              row.gate ? "bg-signal text-ink" : "bg-blue-2 text-white",
            )}
          >
            <span className="text-lg leading-none font-extrabold">{row.day}</span>
            <span className={cn("font-mono text-xs uppercase", row.gate ? "text-ink" : "text-signal")}>
              {row.month}
            </span>
          </span>
          <span className="min-w-0 truncate text-[15px] font-semibold text-white">{row.title}</span>
          {row.meta ? (
            <span className="font-mono text-xs whitespace-nowrap text-on-blue uppercase">{row.meta}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
