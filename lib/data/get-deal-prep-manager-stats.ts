import { createClient } from "@/lib/supabase/server";

export type DealPrepManagerStat = {
  userId: string;
  prepCountThisWeek: number;
  sharedCount: number;
  latestAccount: string | null;
  latestAt: string | null;
};

export async function fetchDealPrepManagerStats(
  orgUserIds: string[],
): Promise<DealPrepManagerStat[]> {
  if (!orgUserIds.length) {
    return [];
  }

  const supabase = await createClient();
  if (!supabase) {
    return [];
  }

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data, error } = await supabase
    .from("deal_prep_sessions")
    .select("user_id, account_name, created_at, shared_with_manager")
    .in("user_id", orgUserIds)
    .gte("created_at", weekAgo.toISOString())
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  const byUser = new Map<string, DealPrepManagerStat>();

  for (const row of data) {
    const existing = byUser.get(row.user_id);
    if (!existing) {
      byUser.set(row.user_id, {
        userId: row.user_id,
        prepCountThisWeek: 1,
        sharedCount: row.shared_with_manager ? 1 : 0,
        latestAccount: row.account_name,
        latestAt: row.created_at,
      });
      continue;
    }

    existing.prepCountThisWeek += 1;
    if (row.shared_with_manager) {
      existing.sharedCount += 1;
    }
  }

  return [...byUser.values()];
}

export async function fetchSharedDealPrepForManager(orgUserIds: string[]) {
  if (!orgUserIds.length) {
    return [];
  }

  const supabase = await createClient();
  if (!supabase) {
    return [];
  }

  const { data } = await supabase
    .from("deal_prep_sessions")
    .select("id, user_id, account_name, industry, created_at, version_number, meeting_type")
    .in("user_id", orgUserIds)
    .eq("shared_with_manager", true)
    .order("created_at", { ascending: false })
    .limit(20);

  return data ?? [];
}
