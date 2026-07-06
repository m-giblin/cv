"use client";

import { Loader2, Plus, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ContentAssetManagement } from "@/components/admin/content-asset-management";
import { HandoffCard } from "@/components/dashboard/handoff-practice-layout";
import { HandoffMetricStrip } from "@/components/dashboard/handoff-section-page";
import { CorpusFeedbackAdmin } from "@/components/corpus/corpus-feedback-admin";
import { Button } from "@/components/ui/button";
import type { CorpusHealthItem } from "@/lib/corpus/health";

type CorpusAsset = {
  id: string;
  title: string;
  url: string;
  assetType: string;
  projectTags: string[];
  moduleTags: string[];
  version: number;
  healthStatus: string;
  updatedAt: string;
};

const CORPUS_COLS = "1fr 100px 160px 90px 60px 80px 120px";

function typeBadge(assetType: string) {
  const lower = assetType.toLowerCase();
  if (lower.includes("battle")) return { bg: "#fee2e2", color: "#dc2626", label: "Battle card" };
  if (lower.includes("playbook")) return { bg: "#cffafe", color: "#0e7490", label: "Playbook" };
  if (lower.includes("demo")) return { bg: "#dbeafe", color: "#1d4ed8", label: "Demo guide" };
  if (lower.includes("one") || lower.includes("pager")) {
    return { bg: "#ede9fe", color: "#5b21b6", label: "One-pager" };
  }
  return { bg: "#e8f2fc", color: "#0057a8", label: assetType.replaceAll("_", " ") };
}

function healthBadge(status: string) {
  if (status === "broken") return { label: "Broken link", bg: "#fee2e2", color: "#dc2626" };
  if (status === "stale") return { label: "Stale", bg: "#fef3c7", color: "#b45309" };
  return { label: "Healthy", bg: "#dcfce7", color: "#15803d" };
}

export function MasterCorpusAdmin() {
  const [assets, setAssets] = useState<CorpusAsset[]>([]);
  const [healthItems, setHealthItems] = useState<CorpusHealthItem[]>([]);
  const [pendingFeedback, setPendingFeedback] = useState(0);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [assetsRes, healthRes, feedbackRes] = await Promise.all([
      fetch("/api/admin/content-assets"),
      fetch("/api/corpus/health"),
      fetch("/api/corpus/feedback"),
    ]);

    if (assetsRes.ok) {
      const body = (await assetsRes.json()) as { assets: CorpusAsset[] };
      setAssets(body.assets ?? []);
    }
    if (healthRes.ok) {
      const body = (await healthRes.json()) as { items: CorpusHealthItem[] };
      setHealthItems(body.items ?? []);
    }
    if (feedbackRes.ok) {
      const body = (await feedbackRes.json()) as { feedback: unknown[] };
      setPendingFeedback(body.feedback?.length ?? 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const staleCount = useMemo(
    () => healthItems.filter((item) => item.issue === "stale").length,
    [healthItems],
  );
  const brokenCount = useMemo(
    () => healthItems.filter((item) => item.issue === "broken").length,
    [healthItems],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assets.slice(0, 12);
    return assets
      .filter((asset) =>
        [asset.title, asset.url, asset.assetType, ...asset.projectTags, ...asset.moduleTags]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 12);
  }, [assets, search]);

  async function verifyAllLinks() {
    setVerifying(true);
    const response = await fetch("/api/corpus/health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verifyAll: true }),
    });
    setVerifying(false);
    if (!response.ok) {
      toast.error("Link verification failed.");
      return;
    }
    const body = (await response.json()) as { verified: number; broken: number };
    toast.success(`Verified ${body.verified} links · ${body.broken} broken`);
    void load();
  }

  return (
    <div className="handoff-page-enter space-y-5">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h1 className="font-display text-xl font-extrabold text-[#0a1628]">Master Corpus</h1>
          <p className="mt-1 text-xs text-[#64748b]">
            Tagged content assets — the grounded knowledge base for ISC Lab, Deal Prep, and Q&A routing
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={verifying} onClick={() => void verifyAllLinks()} size="sm" type="button" variant="outline">
            {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Run health check
          </Button>
          <Button onClick={() => setShowAddForm((open) => !open)} size="sm" type="button">
            <Plus className="mr-2 h-4 w-4" />
            Add asset
          </Button>
        </div>
      </header>

      <HandoffMetricStrip
        metrics={[
          {
            label: "Total assets",
            value: String(assets.length),
            sub: "Across all types",
            accent: "#10b981",
          },
          {
            label: "Stale assets",
            value: String(staleCount),
            sub: "Not updated in 90d+",
            accent: "#f59e0b",
            valueClassName: staleCount > 0 ? "text-[#f59e0b]" : undefined,
          },
          {
            label: "Broken links",
            value: String(brokenCount),
            sub: "Need re-linking",
            accent: "#ef4444",
            valueClassName: brokenCount > 0 ? "text-[#ef4444]" : undefined,
          },
          {
            label: "Pending feedback",
            value: String(pendingFeedback),
            sub: "SE Q&A needing SME",
            accent: "#cc27b0",
            valueClassName: pendingFeedback > 0 ? "text-[#cc27b0]" : undefined,
          },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <input
          className="h-9 max-w-xs flex-1 rounded-lg border border-[#e2eaf5] px-3 text-xs outline-none focus:border-[#0071ce]"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search assets…"
          value={search}
        />
      </div>

      {showAddForm ? <ContentAssetManagement /> : (
        <HandoffCard className="overflow-hidden">
          <div
            className="grid border-b border-[#f1f5f9] bg-[#f8fafd] px-[18px] py-[9px]"
            style={{ gridTemplateColumns: CORPUS_COLS }}
          >
            {["Asset", "Type", "Tags", "Health", "Ver", "Updated", ""].map((header) => (
              <span className="text-[9.5px] font-bold uppercase tracking-[0.07em] text-[#94a3b8]" key={header}>
                {header}
              </span>
            ))}
          </div>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-[#94a3b8]" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-[#94a3b8]">No assets match your search.</p>
          ) : (
            filtered.map((asset) => {
              const health = healthBadge(asset.healthStatus);
              const type = typeBadge(asset.assetType);
              const tags = [...asset.projectTags, ...asset.moduleTags].join(" · ");
              return (
                <div
                  className="grid cursor-pointer items-center border-b border-[#f9fafb] px-[18px] py-[10px] transition hover:bg-[#f7fafd] last:border-b-0"
                  key={asset.id}
                  style={{ gridTemplateColumns: CORPUS_COLS }}
                >
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-[#1e293b]">{asset.title}</p>
                    <p className="mt-[1px] text-[10px] text-[#94a3b8]">{asset.url}</p>
                  </div>
                  <span
                    className="w-fit rounded-full px-[8px] py-[2px] text-[9.5px] font-bold capitalize"
                    style={{ background: type.bg, color: type.color }}
                  >
                    {type.label}
                  </span>
                  <span className="truncate text-[11px] text-[#64748b]">{tags || "—"}</span>
                  <span
                    className="w-fit rounded-full px-[8px] py-[2px] text-[9.5px] font-bold"
                    style={{ background: health.bg, color: health.color }}
                  >
                    {health.label}
                  </span>
                  <span className="text-[11.5px] text-[#475569]">v{asset.version}</span>
                  <span className="text-[11.5px] text-[#94a3b8]">
                    {new Date(asset.updatedAt).toLocaleDateString()}
                  </span>
                  <div className="flex gap-[6px]">
                    <button
                      className="inline-flex items-center rounded-md border border-[#e2eaf5] bg-white px-[10px] py-[5px] text-[11px] font-semibold text-[#334155]"
                      onClick={() => setShowAddForm(true)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="inline-flex items-center rounded-md bg-[#e8f2fc] px-[10px] py-[5px] text-[11px] font-semibold text-[#0057a8]"
                      type="button"
                    >
                      AI tag
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </HandoffCard>
      )}

      <CorpusFeedbackAdmin />
    </div>
  );
}
