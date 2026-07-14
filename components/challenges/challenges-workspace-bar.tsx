"use client";

import Link from "next/link";
import { ChevronLeft, Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { AccessTier } from "@/lib/auth/rbac";

type PortalView = "browse" | "submissions" | "generate";

export function ChallengesWorkspaceBar({
  tier,
  backHref,
  testMode,
  stats,
  showGenerator,
  showHelp,
  onToggleHelp,
}: {
  tier: AccessTier;
  backHref: string;
  testMode?: boolean;
  stats: { total: number; earned: number; inFlight: number; submittedCount: number };
  showGenerator: boolean;
  showHelp: boolean;
  onToggleHelp: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view");

  const view: PortalView =
    viewParam === "generate" && showGenerator
      ? "generate"
      : viewParam === "submissions"
        ? "submissions"
        : "browse";

  const setView = useCallback(
    (nextView: PortalView) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextView === "browse") params.delete("view");
      else params.set("view", nextView);
      router.replace(`/challenges?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2.5 border-b border-[#E2DFD9] bg-white px-5 py-2.5">
      <Link
        className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#A09D98] hover:text-[#0071ce]"
        href={backHref}
      >
        <ChevronLeft className="h-3 w-3" strokeWidth={1.6} />
        My Practice
      </Link>
      <span className="text-[#E2DFD9]">›</span>
      <span className="font-mono text-[10.5px] font-medium text-[#0D0E12]">Challenges</span>

      <div className="ml-4 flex overflow-hidden border border-[#E2DFD9]">
        <button
          className={`px-3 py-1 text-[10.5px] font-semibold ${
            view === "browse" ? "bg-[#00143A] text-white" : "border-l border-[#E2DFD9] text-[#6B6860] first:border-l-0"
          }`}
          onClick={() => setView("browse")}
          type="button"
        >
          Browse
        </button>
        <button
          className={`border-l border-[#E2DFD9] px-3 py-1 text-[10.5px] font-semibold ${
            view === "submissions" ? "bg-[#00143A] text-white" : "text-[#6B6860]"
          }`}
          onClick={() => setView("submissions")}
          type="button"
        >
          My submissions{stats.submittedCount > 0 ? ` (${stats.submittedCount})` : ""}
        </button>
        {showGenerator ? (
          <button
            className={`inline-flex items-center gap-1 border-l border-[#E2DFD9] px-3 py-1 text-[10.5px] font-semibold ${
              view === "generate" ? "bg-[#00143A] text-white" : "text-[#6B6860]"
            }`}
            onClick={() => setView("generate")}
            type="button"
          >
            <Plus className="h-2.5 w-2.5" />
            AI generate
          </button>
        ) : null}
      </div>

      {testMode ? (
        <span className="shrink-0 border border-[#D4810A]/30 bg-[#FFFBF0] px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.08em] text-[#D4810A]">
          Test mode
        </span>
      ) : null}

      <div className="ml-auto flex flex-wrap items-center gap-2.5">
        <span className="font-mono text-[9px] text-[#B0ADA8]">{stats.total} challenges</span>
        <span className="font-mono text-[9px] text-[#B0ADA8]">·</span>
        <span className="font-mono text-[9px] text-[#B0ADA8]">{stats.earned} earned</span>
        {stats.inFlight > 0 ? (
          <span className="bg-[#EEF4FF] px-2 py-0.5 font-mono text-[9px] font-semibold text-[#0071CE]">
            {stats.inFlight} in progress
          </span>
        ) : null}
        <button
          className="font-mono text-[9px] text-[#0071CE] hover:underline"
          onClick={onToggleHelp}
          type="button"
        >
          {showHelp ? "Hide tips" : "How it works"}
        </button>
      </div>
    </div>
  );
}
