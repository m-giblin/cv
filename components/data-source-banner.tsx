import type { DataSource } from "@/lib/data/get-dashboard-data";

/** Shown only in demo/fallback mode, never on normal Supabase-backed pages. */
export function DataSourceBanner({ source }: { source: DataSource }) {
 if (source !== "demo") {
 return null;
 }

 return (
 <p
 className="rounded-[10px] border border-signal-edge/40 bg-signal-soft px-4 py-2.5 text-sm text-ink"
 role="status"
 >
 <span className="font-bold">Demo mode.</span> Sign in with Supabase to see live data.
 </p>
 );
}
