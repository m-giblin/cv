import { cn } from "@/lib/utils";

export type StampState = "earned" | "ready" | "partial" | "none";

/** Gate stamp. Always render a text caption beside or under it; the circle alone is not the meaning. */
export function Stamp({
  state,
  size = 38,
  onDark = false,
  label,
  className,
}: {
  state: StampState;
  size?: number;
  onDark?: boolean;
  /** Accessible name, e.g. "Discovery: ready to submit". */
  label?: string;
  className?: string;
}) {
  return (
    <span
      aria-label={label}
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full font-bold text-ink",
        state === "earned" && "-rotate-[8deg] bg-signal",
        state === "ready" && "border-2 border-ink bg-signal",
        state === "partial" && cn("border-2 border-dashed", onDark ? "border-signal" : "border-blue"),
        state === "none" && cn("border-2", onDark ? "border-badge-line" : "border-line-strong"),
        className,
      )}
      role={label ? "img" : undefined}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {state === "earned" ? "✓" : null}
    </span>
  );
}
