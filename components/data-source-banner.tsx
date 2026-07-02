import { Database, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DataSource } from "@/lib/data/get-dashboard-data";

export function DataSourceBanner({ source }: { source: DataSource }) {
  if (source === "supabase") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-sp-blue/15 bg-sp-blue-soft/50 px-3 py-2 text-xs text-sp-blue-deep">
        <Database className="h-3.5 w-3.5 shrink-0" />
        <span>Live data from Supabase</span>
        <Badge tone="blue">Connected</Badge>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-sp-magenta/15 bg-sp-magenta-soft/40 px-3 py-2 text-xs text-sp-magenta">
      <Sparkles className="h-3.5 w-3.5 shrink-0" />
      <span>Demo mode — seed Supabase or sign in to see live data</span>
    </div>
  );
}
