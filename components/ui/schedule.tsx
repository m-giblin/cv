import type { ReactNode } from "react";
import { Tag } from "@/components/ui/tag";
import { cn } from "@/lib/utils";

export type ScheduleRow = {
  id: string;
  day: string;
  month: string;
  title: ReactNode;
  meta?: ReactNode;
  gate?: boolean;
};

/** Date rows: month over day, a two-line cell, and a Gate badge where relevant. */
export function Schedule({ rows, className }: { rows: ScheduleRow[]; className?: string }) {
  return (
    <ul className={cn("flex flex-col", className)}>
      {rows.map((row) => (
        <li className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-4 border-t border-line py-3.5" key={row.id}>
          <span className="flex flex-col">
            <span className="label-caps">{row.month}</span>
            <span className="num text-[26px] leading-none font-extrabold">{row.day}</span>
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[15px] font-bold text-ink">{row.title}</span>
            {row.meta ? <span className="truncate text-[13px] text-muted">{row.meta}</span> : null}
          </span>
          {row.gate ? <Tag tone="blue">Gate</Tag> : <span />}
        </li>
      ))}
    </ul>
  );
}

export { Schedule as DateRows };
