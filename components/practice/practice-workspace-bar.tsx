import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { SimulationStepStrip } from "@/components/simulation/simulation-step-strip";
import type { AccessTier } from "@/lib/auth/rbac";

export function PracticeWorkspaceBar({
  tier,
  scenarioLabel,
  workspaceTag,
  workspaceTagBg,
  workspaceTagColor,
  step,
  backHref,
  testMode,
  backLabel: backLabelOverride,
  trailing,
}: {
  tier: AccessTier;
  scenarioLabel: string;
  workspaceTag: string;
  workspaceTagBg: string;
  workspaceTagColor: string;
  step?: 1 | 2 | 3;
  backHref: string;
  testMode?: boolean;
  backLabel?: string;
  trailing?: ReactNode;
}) {
  const backLabel = backLabelOverride ?? (tier === "se" ? "My Workspace" : "My Practice");

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[#E2DFD9] bg-white px-5 py-2.5">
      <Link
        className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#A09D98] hover:text-[#0071ce]"
        href={backHref}
      >
        <ChevronLeft className="h-3 w-3" strokeWidth={1.6} />
        {backLabel}
      </Link>
      <span className="text-[#E2DFD9]">›</span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <span className="truncate font-mono text-[10.5px] font-medium text-[#0D0E12]">{scenarioLabel}</span>
        <span
          className="shrink-0 px-2 py-0.5 font-mono text-[8.5px] font-medium uppercase tracking-[0.06em]"
          style={{ background: workspaceTagBg, color: workspaceTagColor }}
        >
          {workspaceTag}
        </span>
        {testMode ? (
          <span className="shrink-0 border border-[#D4810A]/30 bg-[#FFFBF0] px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.08em] text-[#D4810A]">
            Test mode
          </span>
        ) : null}
      </div>
      {trailing ?? (step ? <SimulationStepStrip className="ml-auto" step={step} /> : null)}
    </div>
  );
}
