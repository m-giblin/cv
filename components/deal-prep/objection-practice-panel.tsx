"use client";

import { X } from "lucide-react";
import { SimulationWorkspace } from "@/components/simulation-workspace";
import { createObjectionPracticeAssignment } from "@/lib/simulations/objection-practice-prompt";
import type { SeLevel } from "@/lib/types";

export function ObjectionPracticePanel({
 objection,
 accountName,
 industry,
 solutionFocus,
 userId,
 userLevel = "Basic",
 onClose,
}: {
 objection: string;
 accountName: string;
 industry: string;
 solutionFocus: string;
 userId: string;
 userLevel?: SeLevel | string;
 onClose: () => void;
}) {
 const assignment = createObjectionPracticeAssignment({
 userId,
 objection,
 accountName,
 industry,
 solutionFocus,
 });

  return (
    <aside
      aria-label="Objection practice"
      className="flex min-h-0 flex-col rounded-[14px] border-[1.5px] border-ink bg-white"
    >
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-divider px-5 py-4">
        <div className="flex min-w-0 flex-col gap-2">
          <span className="font-mono text-xs font-medium uppercase tracking-[0.03em] text-blue">
            Practice this objection
          </span>
          <h2 className="text-base font-bold text-ink">{accountName}</h2>
          <blockquote className="rounded-[10px] bg-blue-soft px-3 py-2 text-[15px] leading-[1.5] text-ink">
            &ldquo;{objection}&rdquo;
          </blockquote>
          <p className="text-[13px] leading-[1.45] text-muted">
            Your prep brief stays open alongside — scroll it while you practice here.
          </p>
        </div>
        <button
          aria-label="Close practice"
          className="shrink-0 rounded-full p-2 text-muted transition hover:bg-blue-soft hover:text-ink"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <SimulationWorkspace
          assignment={assignment}
          key={`${objection}-${accountName}`}
          onClose={onClose}
          userLevel={userLevel as "Basic" | "Senior" | "Advisory"}
          variant="embedded"
        />
      </div>
    </aside>
  );
}
