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
    <Card className="group transition hover:border-sp-blue/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-sp-text-subtle">{label}</p>
          <p className="mt-2 font-mono text-3xl font-medium tracking-tight text-sp-text-primary">{value}</p>
          <p className="mt-2 text-sm text-sp-text-muted">{helper}</p>
        </div>
        <span
          className={cn(
            "p-3",
            accent === "magenta"
              ? "bg-sp-magenta-soft text-sp-magenta"
              : "bg-sp-blue-soft text-sp-blue",
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Card>
  );
}
