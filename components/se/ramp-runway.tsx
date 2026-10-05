import { Runway } from "@/components/ui/runway";
import type { RampModel } from "@/lib/se/ramp-model";

/** 13-week (plan-length) runway with segment labels and gate diamonds from the SE's plan. */
export function RampRunway({ model, className }: { model: RampModel; className?: string }) {
  return (
    <Runway
      className={className}
      currentWeek={model.currentWeek}
      segments={model.segments.map((segment) => ({
        label: segment.label,
        weeks: segment.weeks,
        gatePassed: segment.gatePassed,
      }))}
    />
  );
}
