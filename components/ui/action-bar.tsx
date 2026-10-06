import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Sticky navy bar for bulk actions and unsaved changes. Render only when there is something to act on. */
export function ActionBar({
  count,
  summary,
  secondary,
  primary,
  className,
}: {
  count: ReactNode;
  summary?: ReactNode;
  secondary?: ReactNode;
  primary: ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-label="Actions"
      className={cn(
        "on-navy sticky bottom-0 z-10 flex flex-wrap items-center gap-x-6 gap-y-2 bg-navy px-[var(--page-pad-x)] py-3.5 max-sm:px-4",
        className,
      )}
      role="region"
    >
      <span className="text-base font-bold text-white">{count}</span>
      {summary ? <span className="text-sm text-on-navy-muted">{summary}</span> : null}
      <span className="flex-1" />
      {secondary}
      {primary}
    </div>
  );
}
