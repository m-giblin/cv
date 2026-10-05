import { cn } from "@/lib/utils";

/** 8px bar on the divider track, blue fill. */
export function Progress({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(clamped)}
      className={cn("relative h-2 overflow-hidden rounded-full bg-divider", className)}
      role="progressbar"
    >
      <div className="absolute left-0 top-0 h-full rounded-full bg-blue transition-all" style={{ width: `${clamped}%` }} />
    </div>
  );
}
