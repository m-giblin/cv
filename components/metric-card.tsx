import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  accent = "blue",
}: {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  accent?: "blue" | "magenta";
}) {
  return (
    <Card className="group transition hover:border-line-strong">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="label-mono">{label}</p>
          <p className="mt-2 font-mono text-3xl font-medium tracking-tight text-ink">{value}</p>
          <p className="mt-2 text-sm text-muted">{helper}</p>
        </div>
        <span
          className={cn(
            "rounded-[10px] bg-blue-soft p-3 text-blue",
            accent === "magenta" && "border border-blue",
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Card>
  );
}
