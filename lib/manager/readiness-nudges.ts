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

  // Rows are independent, so check and send them in parallel instead of one SE at a time.
  await Promise.all(rows.map((row) => nudgeRow(supabase, managerId, row, since)));
}

async function nudgeRow(
  supabase: SupabaseClient<Database>,
  managerId: string,
  row: ReadinessMapSeRow,
  since: string,
): Promise<void> {
  const criticalDims = (Object.keys(row.dims) as ReadinessDimName[]).filter(
    (dim) => row.dims[dim].level === "critical",
  );
  if (criticalDims.length === 0) return;

  // Only nudge on the single worst real-critical dim per row per window —
  // avoids paging someone with 9 separate notifications at once.
  const worstDim = criticalDims.sort((a, b) => row.dims[a].numericScore - row.dims[b].numericScore)[0];
  const cell = row.dims[worstDim];
  const actionUrl = cell.actions[0]?.href ?? "/growth/readiness";

  const managerTitle = `${row.firstName} is critical on ${worstDim}`;
  // Dedupe on the manager's own copy: RLS lets the manager read their notifications but not the
  // SE's, so checking the SE's row always came back empty and re-sent the pair on every page view.
  // Both copies are always written together, so the manager's copy stands in for the pair.
  const { data: existing } = await supabase
    .from("notifications")
    .select("id")
    .eq("action_url", actionUrl)
    .eq("user_id", managerId)
    .eq("title", managerTitle)
    .gte("created_at", since)
    .limit(1)
    .maybeSingle();
  if (existing) return;

  await Promise.all([
    createNotification(supabase, {
      userId: row.userId,
      title: `${worstDim} needs attention`,
      body: cell.insight,
      actionUrl,
    }),
    createNotification(supabase, {
      userId: managerId,
      title: managerTitle,
      body: cell.insight,
      actionUrl,
    }),
  ]);
}
