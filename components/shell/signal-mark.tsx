import { cn } from "@/lib/utils";

/**
 * Product mark: a 26px signal square, radius 8, with "SE" in Geist Mono 12 ink.
 * Used wherever a tenant has no logo of its own. Never a vendor logo.
 */
export function SignalMark({ className, size = 26 }: { className?: string; size?: number }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-[8px] bg-signal font-mono text-xs font-medium text-ink",
        className,
      )}
      style={{ width: size, height: size }}
    >
      SE
    </span>
  );
}
