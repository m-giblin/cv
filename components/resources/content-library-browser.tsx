"use client";

import { ExternalLink, Loader2, MessageCircleQuestion, Rocket } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CorpusFeedbackWidget } from "@/components/corpus/corpus-feedback-widget";
import { SailPointLogoMark } from "@/components/shell/sailpoint-logo-mark";
import { SP_BLUE_BTN, SP_INPUT_CLS, SP_OUTLINE_BTN } from "@/components/se/sp-form-primitives";

type ContentAsset = {
  id: string;
  title: string;
  category: string;
  url: string;
  contentType: string | null;
  assetType?: string;
  projectTags?: string[];
  moduleTags?: string[];
};

const RESOURCE_ACCENTS: Record<string, { accent: string; tagBg: string; tagColor: string }> = {
  battlecard: { accent: "linear-gradient(90deg,#0033a1,#0071ce)", tagBg: "#e8f2fc", tagColor: "#0057a8" },
  demo_guide: { accent: "linear-gradient(90deg,#5b21b6,#7c3aed)", tagBg: "#ede9fe", tagColor: "#5b21b6" },
  one_pager: { accent: "linear-gradient(90deg,#0369a1,#0891b2)", tagBg: "#cffafe", tagColor: "#0891b2" },
  playbook: { accent: "linear-gradient(90deg,#b45309,#d97706)", tagBg: "#fef3c7", tagColor: "#b45309" },
  default: { accent: "linear-gradient(90deg,#64748b,#94a3b8)", tagBg: "#f1f5f9", tagColor: "#64748b" },
};

const FILTERS = ["All", "Battle cards", "Demo guides", "One-pagers", "Playbooks", "Agentic AI"] as const;

const FEATURED_GUIDE = {
  title: "SailPoint Agentic AI Field Guide",
  description: "Complete talk track, CISO objections, and AIS demo flow for FY2026 Q2 pipeline",
  url: "/resources?q=Agentic+AI+Field+Guide",
};

function resourceStyle(category: string) {
  const key = category.toLowerCase().replace(/\s+/g, "_");
  return RESOURCE_ACCENTS[key] ?? RESOURCE_ACCENTS.default;
}

function categoryLabel(category: string) {
  return category.replaceAll("_", " ");
}

export function ContentLibraryBrowser({
  releaseProjectTags = [],
}: {
  releaseProjectTags?: string[];
}) {
  const [assets, setAssets] = useState<ContentAsset[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]>("All");
  const [projectTag, setProjectTag] = useState(releaseProjectTags[0] ?? "");
  const [isLoading, setIsLoading] = useState(true);
  const [feedbackAssetId, setFeedbackAssetId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (projectTag) params.set("projectTag", projectTag);
    const response = await fetch(`/api/content?${params.toString()}`);
    if (response.ok) {
      const body = (await response.json()) as { assets: ContentAsset[] };
      setAssets(body.assets);
    }
    setIsLoading(false);
  }, [projectTag, search]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 200);
    return () => clearTimeout(timer);
  }, [load]);

  const filtered = useMemo(() => {
    return assets.filter((asset) => {
      if (activeFilter === "All") return true;
      const label = categoryLabel(asset.category).toLowerCase();
      if (activeFilter === "Battle cards") return label.includes("battle");
      if (activeFilter === "Demo guides") return label.includes("demo");
      if (activeFilter === "One-pagers") return label.includes("one");
      if (activeFilter === "Playbooks") return label.includes("playbook");
      if (activeFilter === "Agentic AI") {
        const haystack = `${asset.title} ${asset.category} ${(asset.projectTags ?? []).join(" ")} ${(asset.moduleTags ?? []).join(" ")}`.toLowerCase();
        return haystack.includes("agentic");
      }
      return true;
    });
  }, [activeFilter, assets]);

  const feedbackAsset = filtered.find((asset) => asset.id === feedbackAssetId);

  return (
    <div className="space-y-4">
      {releaseProjectTags.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-[rgba(0,113,206,0.15)] bg-[#f0f7ff] px-3.5 py-2.5 text-[12px]">
          <Rocket className="h-4 w-4 text-[#0071ce]" />
          <span className="font-semibold text-[#0a1628]">Your release training:</span>
          {releaseProjectTags.map((tag) => (
            <button
              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                projectTag === tag ? "bg-[#0071ce] text-white" : "bg-white text-[#0071ce] hover:bg-[#e8f2fc]"
              }`}
              key={tag}
              onClick={() => setProjectTag((current) => (current === tag ? "" : tag))}
              type="button"
            >
              {tag}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex items-center gap-[18px] rounded-[13px] bg-gradient-to-br from-[#001228] to-[#002468] p-[16px_20px]">
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[9.5px] font-bold uppercase tracking-[0.07em] text-white/40">
            New · Agentic AI
          </p>
          <p className="font-display text-[15px] font-extrabold text-white">{FEATURED_GUIDE.title}</p>
          <p className="mb-3 mt-1 text-[12px] text-white/55">{FEATURED_GUIDE.description}</p>
          <div className="flex flex-wrap gap-2">
            <a className={SP_BLUE_BTN} download href={FEATURED_GUIDE.url}>
              Download PDF
            </a>
            <a
              className="inline-flex items-center rounded-lg border border-white/15 bg-white/10 px-[13px] py-[6px] text-[11.5px] font-semibold text-white hover:bg-white/15"
              href={FEATURED_GUIDE.url}
              rel="noreferrer"
              target="_blank"
            >
              View online →
            </a>
          </div>
        </div>
        <div className="flex h-16 w-[100px] shrink-0 items-center justify-center rounded-[10px] border border-[rgba(0,113,206,0.4)] bg-[rgba(0,113,206,0.3)]">
          <SailPointLogoMark variant="flat-white" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-[10px]">
        <div className="flex max-w-[320px] flex-1 items-center gap-2 rounded-[9px] border-[1.5px] border-[#e2eaf5] bg-white px-[13px] py-2">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#94a3b8" strokeWidth="1.3" strokeLinecap="round">
            <circle cx="6" cy="6" r="4.5" />
            <line x1="9.5" x2="12.5" y1="9.5" y2="12.5" />
          </svg>
          <input
            className="flex-1 bg-transparent text-[12px] text-[#1e293b] outline-none placeholder:text-[#94a3b8]"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search resources..."
            value={search}
          />
        </div>
        <div className="flex flex-wrap gap-[7px]">
          {FILTERS.map((filter) => (
            <button
              className={`rounded-full px-[14px] py-[6px] text-[11.5px] font-semibold transition ${
                activeFilter === filter
                  ? "border border-[rgba(0,113,206,0.25)] bg-[#e8f2fc] text-[#0057a8]"
                  : "border border-[#e2eaf5] bg-white text-[#475569] hover:bg-[#f8fafd]"
              }`}
              key={filter}
              onClick={() => setActiveFilter(filter)}
              type="button"
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {isLoading && assets.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#0071ce]" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-[12.5px] text-[#64748b]">No resources match your search.</p>
      ) : (
        <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((asset) => {
            const style = resourceStyle(asset.category);
            const tags = [...(asset.projectTags ?? []), ...(asset.moduleTags ?? [])];
            return (
              <div
                className="overflow-hidden rounded-xl border border-[#e2eaf5] bg-white shadow-[0_1px_4px_rgba(0,20,58,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(0,20,58,0.1)]"
                key={asset.id}
              >
                <div className="h-[3px]" style={{ background: style.accent }} />
                <div className="p-[14px_16px]">
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className="rounded-full px-2 py-0.5 text-[9.5px] font-bold"
                      style={{ background: style.tagBg, color: style.tagColor }}
                    >
                      {categoryLabel(asset.category)}
                    </span>
                    <span className="text-[9.5px] text-[#94a3b8]">{asset.contentType ?? "PDF"}</span>
                  </div>
                  <p className="mb-1 text-[13px] font-bold leading-[1.4] text-[#0a1628]">{asset.title}</p>
                  <p className="mb-2.5 text-[11px] leading-[1.5] text-[#64748b]">
                    {tags.length > 0 ? tags.join(" · ") : "Field-ready enablement asset"}
                  </p>
                  <div className="flex gap-[7px]">
                    <a className={SP_OUTLINE_BTN} href={asset.url} rel="noreferrer" target="_blank">
                      View
                    </a>
                    <a
                      className="inline-flex items-center rounded-md bg-[#e8f2fc] px-[10px] py-[5px] text-[11px] font-semibold text-[#0057a8]"
                      download
                      href={asset.url}
                    >
                      Download
                    </a>
                    <button
                      className="ml-auto inline-flex items-center text-[#64748b] hover:text-[#0071ce]"
                      onClick={() => setFeedbackAssetId((current) => (current === asset.id ? null : asset.id))}
                      type="button"
                    >
                      <MessageCircleQuestion className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {feedbackAsset ? (
        <CorpusFeedbackWidget assetTitle={feedbackAsset.title} contentAssetId={feedbackAsset.id} />
      ) : null}
    </div>
  );
}
