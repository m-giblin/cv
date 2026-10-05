import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { createNotification } from "@/lib/notifications/create-notification";
import type { ReadinessDimName, ReadinessMapSeRow } from "@/lib/manager/readiness-map-data";

const DEDUPE_WINDOW_DAYS = 7;

/**
 * Suggest-and-link nudge, not silent auto-assignment: a critical dim gets one
 * notification to the SE and one to the manager per DEDUPE_WINDOW_DAYS,
 * each linking to that dim's existing recommended action — deliberately
 * safer than writing into another person's plan/simulation queue directly.
 */
export async function checkAndNotifyThresholdCrossings(
  supabase: SupabaseClient<Database>,
  managerId: string,
  rows: ReadinessMapSeRow[],
): Promise<void> {
  const since = new Date(Date.now() - DEDUPE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  for (const row of rows) {
    const criticalDims = (Object.keys(row.dims) as ReadinessDimName[]).filter(
      (dim) => row.dims[dim].level === "critical",
    );
    if (criticalDims.length === 0) continue;

    // Only nudge on the single worst real-critical dim per row per window —
    // avoids paging someone with 9 separate notifications at once.
    const worstDim = criticalDims.sort((a, b) => row.dims[a].numericScore - row.dims[b].numericScore)[0];
    const cell = row.dims[worstDim];
    const actionUrl = cell.actions[0]?.href ?? "/growth/readiness";

    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("action_url", actionUrl)
      .eq("user_id", row.userId)
      .gte("created_at", since)
      .limit(1)
      .maybeSingle();
    if (existing) continue;

    await createNotification(supabase, {
      userId: row.userId,
      title: `${worstDim} needs attention`,
      body: cell.insight,
      actionUrl,
    });

    await createNotification(supabase, {
      userId: managerId,
      title: `${row.firstName} is critical on ${worstDim}`,
      body: cell.insight,
      actionUrl,
    });
  }
}
