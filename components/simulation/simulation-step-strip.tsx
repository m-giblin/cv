import { LifecycleStepper } from "@/components/ui/flight-strip";
import { cn } from "@/lib/utils";

/** Roleplay → AI feedback → Submit, as the v3 lifecycle stepper (dot + word, CSS checks). */
export function SimulationStepStrip({
  step,
  className,
}: {
  step: 1 | 2 | 3;
  className?: string;
}) {
  const steps = [
    { n: 1, label: "Roleplay" },
    { n: 2, label: "AI feedback" },
    { n: 3, label: "Submit" },
  ];

  return (
    <div aria-label="Simulation steps" className={cn("rounded-full border border-line bg-white px-4 py-2", className)} role="group">
      <LifecycleStepper
        stages={steps.map((item) => ({
          label: item.label,
          stage: step > item.n ? "done" : step === item.n ? "current" : "upcoming",
        }))}
      />
    </div>
  );
}
