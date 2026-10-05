"use client";

import Link from "next/link";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AdminTable,
  EmptyState,
  Field,
  KpiStrip,
  LoadingState,
  Mono,
  SecondaryButton,
  SectionHeading,
  Td,
  TextInput,
  Th,
} from "@/components/admin/admin-ui";
import { CorpusFeedbackAdmin } from "@/components/corpus/corpus-feedback-admin";
import { Tag } from "@/components/ui/tag";
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

type TagTone = "neutral" | "blue" | "success" | "warning" | "danger" | "signal";

function typeLabel(assetType: string) {
  const lower = assetType.toLowerCase();
  if (lower.includes("battle")) return "Battle card";
  if (lower.includes("playbook")) return "Playbook";
  if (lower.includes("demo")) return "Demo guide";
  if (lower.includes("one") || lower.includes("pager")) return "One-pager";
  return assetType.replaceAll("_", " ");
}

function healthTag(status: string): { label: string; tone: TagTone; symbol: string } {
  if (status === "broken") return { label: "Broken link", tone: "danger", symbol: "▲" };
  if (status === "stale") return { label: "Stale", tone: "warning", symbol: "◆" };
  return { label: "Healthy", tone: "success", symbol: "✓" };
}

export function MasterCorpusAdmin() {
  const [assets, setAssets] = useState<CorpusAsset[]>([]);
  const [healthItems, setHealthItems] = useState<CorpusHealthItem[]>([]);
  const [pendingFeedback, setPendingFeedback] = useState(0);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [search, setSearch] = useState("");

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
    <div className="flex flex-col gap-6">
      <SectionHeading
        actions={
          <>
            <SecondaryButton disabled={verifying} onClick={() => void verifyAllLinks()}>
              {verifying ? (
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw aria-hidden className="h-4 w-4" />
              )}
              Run health check
            </SecondaryButton>
            <Link className="btn-primary inline-flex items-center gap-1.5" href="/admin/content">
              <Plus aria-hidden className="h-4 w-4" />
              Add asset
            </Link>
          </>
        }
        meta="Grounded knowledge for Lab, Deal Prep and Q&A routing"
        title="Master corpus"
      />

      <KpiStrip
        items={[
          { label: "Total assets", value: loading ? "—" : assets.length },
          { label: "Stale 90d+", value: loading ? "—" : staleCount },
          { label: "Broken links", value: loading ? "—" : brokenCount },
          { label: "Pending feedback", value: loading ? "—" : pendingFeedback },
        ]}
      />

      <div className="flex flex-col gap-3">
        <Field className="max-w-sm" htmlFor="corpus-asset-search" label="Search assets">
          <TextInput
            id="corpus-asset-search"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Title, URL, type or tag"
            type="search"
            value={search}
          />
        </Field>

        {loading ? (
          <div className="rounded-[14px] border border-line bg-white">
            <LoadingState label="Loading corpus…" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-[14px] border border-line bg-white">
            <EmptyState>{assets.length === 0 ? "No assets in the corpus yet." : "No assets match your search."}</EmptyState>
          </div>
        ) : (
          <AdminTable caption="Master corpus assets">
            <thead>
              <tr>
                <Th>Asset</Th>
                <Th>Type</Th>
                <Th>Tags</Th>
                <Th>Health</Th>
                <Th>Ver</Th>
                <Th>Updated</Th>
                <Th>
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((asset) => {
                const health = healthTag(asset.healthStatus);
                const tags = [...asset.projectTags, ...asset.moduleTags].join(" · ");
                return (
                  <tr className="hover:bg-blue-soft" key={asset.id}>
                    <Td className="max-w-[320px]">
                      <p className="truncate font-bold">{asset.title}</p>
                      <p className="truncate text-[13px] text-muted">{asset.url}</p>
                    </Td>
                    <Td>
                      <Tag tone="blue">{typeLabel(asset.assetType)}</Tag>
                    </Td>
                    <Td className="max-w-[220px] truncate text-sm text-ink-2">{tags || "—"}</Td>
                    <Td>
                      <Tag tone={health.tone}>
                        <span aria-hidden>{health.symbol}</span>
                        {health.label}
                      </Tag>
                    </Td>
                    <Td>
                      <Mono>v{asset.version}</Mono>
                    </Td>
                    <Td>
                      <Mono>{new Date(asset.updatedAt).toLocaleDateString()}</Mono>
                    </Td>
                    <Td>
                      <Link className="link text-sm" href="/admin/content">
                        Edit
                      </Link>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </AdminTable>
        )}
        {!loading && !search.trim() && assets.length > filtered.length ? (
          <p className="text-[13px] text-muted">
            Showing {filtered.length} of {assets.length}. Manage the full library in{" "}
            <Link className="link" href="/admin/content">
              Content
            </Link>
            .
          </p>
        ) : null}
      </div>

      <CorpusFeedbackAdmin />
    </div>
  );
}
