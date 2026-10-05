import { Sparkles } from "lucide-react";
import type { DataSource } from "@/lib/data/get-dashboard-data";

/** Shown only in demo/fallback mode — not on normal Supabase-backed pages. */
export function DataSourceBanner({ source }: { source: DataSource }) {
 if (source !== "demo") {
 return null;
 }

 return (
 <div className="flex items-center gap-2 rounded-[16px] border border-blue bg-blue-soft px-3 py-2 text-xs text-blue">
 <Sparkles className="h-3.5 w-3.5 shrink-0" />
 <span>Demo mode — sign in with Supabase to see live data</span>
 </div>
 );
}
