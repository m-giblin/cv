import { cn } from "@/lib/utils";

export function Progress({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-sp-blue-soft", className)}>
      <div className="sp-progress-fill h-full rounded-full transition-all" style={{ width: `${clamped}%` }} />
    </div>
  );
}
