import { cn } from "@/lib/utils";

/** 8px bar, radius 4, on the warm track with a blue fill. */
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
      className={cn("relative h-2 overflow-hidden rounded-[4px] bg-track", className)}
      role="progressbar"
    >
      <div
        className="absolute left-0 top-0 h-full rounded-[4px] bg-blue transition-[width] motion-reduce:transition-none"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
