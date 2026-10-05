import type { ReactNode } from "react";

/** Sticky bottom bar for bulk actions and unsaved changes. Render only when there is something to act on. */
export function ActionBar({
  count,
  summary,
  secondary,
  primary,
}: {
  count: ReactNode;
  summary?: ReactNode;
  secondary?: ReactNode;
  primary: ReactNode;
}) {
  return (
    <div
      className="sticky bottom-0 z-10 flex flex-wrap items-center gap-x-6 gap-y-2 bg-blue px-[var(--gutter)] py-3.5"
      role="region"
      aria-label="Actions"
    >
      <span className="text-base font-bold text-white">{count}</span>
      {summary ? <span className="font-mono text-xs text-on-blue uppercase">{summary}</span> : null}
      <span className="flex-1" />
      {secondary}
      {primary}
    </div>
  );
}
