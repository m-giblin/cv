import { cn } from "@/lib/utils";

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
    <ol className={cn("flex items-center gap-0", className)}>
      {steps.map((item) => {
        const active = step === item.n;
        const done = step > item.n;
        const bg = active ? "#EEF4FF" : "#F9F8F6";
        const border = active ? "#0071CE" : "#E2DFD9";
        const numBg = active ? "#0071CE" : done ? "#0A6E45" : "#E2DFD9";
        const numColor = active || done ? "white" : "#B0ADA8";
        const textColor = active ? "#0D0E12" : done ? "#0A6E45" : "#B0ADA8";

        return (
          <li key={item.n}>
            <div
              className="flex items-center gap-1.5 border px-2.5 py-1"
              style={{ background: bg, borderColor: border }}
            >
              <span
                className="flex h-4 w-4 items-center justify-center rounded-full font-mono text-[8px] font-medium"
                style={{ background: numBg, color: numColor }}
              >
                {item.n}
              </span>
              <span className="text-[10.5px] font-medium" style={{ color: textColor }}>
                {item.label}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
