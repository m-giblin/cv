import { cn } from "@/lib/utils";

/**
 * v2 lifecycle row (Flight strip style): three equal mono-12 cells.
 * Done = blue "✓", current = signal fill with ink text "●", upcoming = muted "○".
 */
export function SimulationStepStrip({
  step,
  className,
}: {
  step: 1 | 2 | 3;
  className?: string;
}) {
  const steps = [
    { n: 1 as const, label: "Roleplay" },
    { n: 2 as const, label: "AI Feedback" },
    { n: 3 as const, label: "Submit" },
  ];

  return (
    <ol
      aria-label="Simulation steps"
      className={cn(
        "grid grid-cols-3 overflow-hidden rounded-[10px] border border-line bg-white font-mono text-xs uppercase tracking-[0.03em]",
        className,
      )}
    >
      {steps.map((item) => {
        const active = step === item.n;
        const done = step > item.n;
        const symbol = done ? "✓" : active ? "●" : "○";

        return (
          <li
            aria-current={active ? "step" : undefined}
            className={cn(
              "whitespace-nowrap px-3 py-[9px] font-medium",
              item.n > 1 && "border-l border-divider",
              done && "text-blue",
              active && "bg-signal text-ink",
              !done && !active && "text-[#5A6884]",
            )}
            key={item.n}
          >
            {symbol} {item.label}
          </li>
        );
      })}
    </ol>
  );
}
