"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { StatusPill } from "@/components/ui/status-pill";
import type { AccessTier } from "@/lib/auth/rbac";

type PortalView = "browse" | "submissions" | "generate";

export function ChallengesWorkspaceBar({
  testMode,
  stats,
  showGenerator,
  showHelp,
  onToggleHelp,
}: {
  tier: AccessTier;
  /** Kept for API compatibility; the shell nav now handles "back". */
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
      router.replace(`/practice/challenges?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-3 pb-5">
      <p className="text-[13px] text-muted">
        {stats.total} available. {stats.earned} earned, {stats.inFlight} in progress.
      </p>
      {testMode ? <StatusPill tone="warning">Test mode</StatusPill> : null}

      <div className="ml-auto flex flex-wrap items-center gap-3">
        <SegmentedToggle
          label="Challenges view"
          onChange={(id) => setView(id as PortalView)}
          options={[
            { id: "browse", label: "Library" },
            {
              id: "submissions",
              label: `My submissions${stats.submittedCount > 0 ? ` (${stats.submittedCount})` : ""}`,
            },
          ]}
          value={view === "submissions" ? "submissions" : "browse"}
        />
        {showGenerator ? (
          <button
            aria-pressed={view === "generate"}
            className="btn-secondary"
            onClick={() => setView(view === "generate" ? "browse" : "generate")}
            type="button"
          >
            {view === "generate" ? "Close generator" : "Generate a challenge"}
          </button>
        ) : null}
        <button
          aria-expanded={showHelp}
          className="link text-sm"
          onClick={onToggleHelp}
          type="button"
        >
          {showHelp ? "Hide tips" : "How it works"}
        </button>
      </div>
    </div>
  );
}
