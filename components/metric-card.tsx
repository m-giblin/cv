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
    <Card className="group transition hover:-translate-y-0.5 hover:border-sp-blue/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-sp-navy-muted">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-sp-navy">{value}</p>
          <p className="mt-2 text-sm text-sp-navy-muted">{helper}</p>
        </div>
        <span
          className={cn(
            "rounded-2xl p-3 transition group-hover:scale-105",
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
