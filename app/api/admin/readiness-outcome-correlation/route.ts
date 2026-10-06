import { NextResponse } from "next/server";
import { requireAdminPageAccess } from "@/lib/auth/require-access";
import { createClient } from "@/lib/supabase/server";

export type OutcomeCorrelationBucket = {
  outcome: "won" | "lost" | "pending";
  avgComposite: number | null;
  sampleSize: number;
};

/**
 * Directional-only report: groups the latest known composite readiness
 * score (readiness_score_snapshots) by each user's most recent Deal Prep
 * outcome tag. Not a statistically rigorous correlation — sample sizes are
 * small until outcome tagging accumulates — the UI must label it as such.
 */
export async function GET() {
  const { tenantId } = await requireAdminPageAccess();
  if (!tenantId) {
    return NextResponse.json({ buckets: [], totalTagged: 0 });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const { data: prepRows } = await supabase
    .from("deal_prep_sessions")
    .select("user_id, outcome, created_at")
    .order("created_at", { ascending: false });

  const latestOutcomeByUser: Record<string, "pending" | "won" | "lost"> = {};
  for (const row of (prepRows ?? []) as Array<{ user_id: string; outcome: string }>) {
    if (!latestOutcomeByUser[row.user_id]) {
      latestOutcomeByUser[row.user_id] = (row.outcome as "pending" | "won" | "lost") ?? "pending";
    }
  }

  const { data: snapshotRows } = await supabase
    .from("readiness_score_snapshots")
    .select("user_id, composite")
    .eq("tenant_id", tenantId);

  const compositeByUser: Record<string, number> = {};
  for (const row of (snapshotRows ?? []) as Array<{ user_id: string; composite: number }>) {
    compositeByUser[row.user_id] = row.composite;
  }

  const grouped: Record<"won" | "lost" | "pending", number[]> = { won: [], lost: [], pending: [] };
  for (const [userId, outcome] of Object.entries(latestOutcomeByUser)) {
    const composite = compositeByUser[userId];
    if (composite == null) continue;
    grouped[outcome].push(composite);
  }

  const buckets: OutcomeCorrelationBucket[] = (["won", "lost", "pending"] as const).map((outcome) => {
    const values = grouped[outcome];
    return {
      outcome,
      avgComposite: values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null,
      sampleSize: values.length,
    };
  });

  return NextResponse.json({
    buckets,
    totalTagged: grouped.won.length + grouped.lost.length,
  });
}
