import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type CorpusHealthItem = {
  id: string;
  title: string;
  issue: "confusing" | "stale" | "zero_usage" | "open_qa" | "broken";
  detail: string;
  severity: "high" | "medium" | "low";
};

export async function fetchCorpusHealthReport(
  supabase: SupabaseClient<Database>,
): Promise<CorpusHealthItem[]> {
  const staleCutoff = new Date();
  staleCutoff.setMonth(staleCutoff.getMonth() - 6);

  const [{ data: assets }, { data: feedback }, { data: engagement }, { data: inquiries }] =
    await Promise.all([
      supabase.from("content_assets").select("id, title, storage_path, updated_at, health_status, last_verified_at"),
      supabase
        .from("corpus_asset_feedback")
        .select("content_asset_id, is_confusing")
        .eq("status", "open"),
      supabase.from("resource_engagement").select("resource_url"),
      supabase
        .from("corpus_qa_inquiries")
        .select("content_asset_id, question")
        .is("escalated_at", null),
    ]);

  const usageCount = new Map<string, number>();
  const urlByAssetId = new Map((assets ?? []).map((a) => [a.storage_path, a.id]));
  for (const row of engagement ?? []) {
    if (!row.resource_url) continue;
    const assetId = urlByAssetId.get(row.resource_url);
    if (assetId) {
      usageCount.set(assetId, (usageCount.get(assetId) ?? 0) + 1);
    }
  }

  const confusingCount = new Map<string, number>();
  for (const row of feedback ?? []) {
    if (row.is_confusing && row.content_asset_id) {
      confusingCount.set(row.content_asset_id, (confusingCount.get(row.content_asset_id) ?? 0) + 1);
    }
  }

  const qaCount = new Map<string, number>();
  for (const row of inquiries ?? []) {
    if (row.content_asset_id) {
      qaCount.set(row.content_asset_id, (qaCount.get(row.content_asset_id) ?? 0) + 1);
    }
  }

  const items: CorpusHealthItem[] = [];

  for (const asset of assets ?? []) {
    const confusing = confusingCount.get(asset.id) ?? 0;
    if (confusing > 0) {
      items.push({
        id: asset.id,
        title: asset.title,
        issue: "confusing",
        detail: `${confusing} open confusing flag(s)`,
        severity: confusing >= 2 ? "high" : "medium",
      });
    }

    const lastTouch = asset.last_verified_at ?? asset.updated_at;
    if (new Date(lastTouch) < staleCutoff || asset.health_status === "stale") {
      items.push({
        id: asset.id,
        title: asset.title,
        issue: "stale",
        detail: `Not verified since ${new Date(lastTouch).toLocaleDateString()}`,
        severity: "medium",
      });
    }

    if ((usageCount.get(asset.id) ?? 0) === 0) {
      items.push({
        id: asset.id,
        title: asset.title,
        issue: "zero_usage",
        detail: "No recorded views or opens",
        severity: "low",
      });
    }

    const openQa = qaCount.get(asset.id) ?? 0;
    if (openQa > 0) {
      items.push({
        id: asset.id,
        title: asset.title,
        issue: "open_qa",
        detail: `${openQa} unanswered SME question(s)`,
        severity: "high",
      });
    }

    if (asset.health_status === "broken") {
      items.push({
        id: asset.id,
        title: asset.title,
        issue: "broken",
        detail: "Link health check failed",
        severity: "high",
      });
    }
  }

  return items.sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2 };
    return rank[a.severity] - rank[b.severity];
  });
}

export async function verifyCorpusAssetLink(
  supabase: SupabaseClient<Database>,
  assetId: string,
): Promise<{ ok: boolean; status: string }> {
  const { data: asset } = await supabase
    .from("content_assets")
    .select("id, storage_path, content_type")
    .eq("id", assetId)
    .maybeSingle();

  if (!asset?.storage_path?.startsWith("http")) {
    return { ok: true, status: "active" };
  }

  try {
    const response = await fetch(asset.storage_path, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    });
    const ok = response.ok || response.status === 405;
    const healthStatus = ok ? "active" : "broken";
    await supabase
      .from("content_assets")
      .update({
        health_status: healthStatus,
        last_verified_at: new Date().toISOString(),
      })
      .eq("id", assetId);
    return { ok, status: healthStatus };
  } catch {
    await supabase
      .from("content_assets")
      .update({ health_status: "broken", last_verified_at: new Date().toISOString() })
      .eq("id", assetId);
    return { ok: false, status: "broken" };
  }
}
