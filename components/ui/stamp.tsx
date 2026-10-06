import { cn } from "@/lib/utils";

export type StampState = "earned" | "ready" | "partial" | "none";

function Check({ className }: { className: string }) {
  return <span aria-hidden className={cn("block h-[45%] w-[25%] -translate-y-[12%] rotate-45 border-r-2 border-b-2", className)} />;
}

/** Gate stamp. Always pair it with a caption or a legend. */
export function Stamp({
  state,
  size = 34,
  label,
  className,
}: {
  state: StampState;
  size?: number;
  /** Accessible name, e.g. "Discovery: ready to submit". */
  label?: string;
  /** Kept for compatibility; v3 stamps look the same on every surface. */
  onDark?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-label={label}
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full",
        state === "earned" && "bg-blue",
        state === "ready" && "border border-signal-edge bg-signal",
        state === "partial" && "border-2 border-dashed border-blue",
        state === "none" && "border-[1.5px] border-line-strong",
        className,
      )}
      role={label ? "img" : undefined}
      style={{ width: size, height: size }}
    >
      {state === "earned" ? <Check className="border-white" /> : null}
      {state === "ready" ? <Check className="border-ink" /> : null}
    </span>
  );
}
