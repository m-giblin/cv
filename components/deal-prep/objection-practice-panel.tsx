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
 <aside className="flex h-full min-h-0 flex-col border border-sp-blue/15 bg-white ">
 <header className="flex shrink-0 items-start justify-between gap-3 border-b border-sp-blue/10 px-4 py-4">
 <div className="min-w-0">
 <p className="text-xs font-bold uppercase tracking-wide text-sp-magenta">Practice this objection</p>
 <p className="mt-1 text-sm font-semibold text-sp-navy">{accountName}</p>
 <p className="mt-2 bg-sp-blue-soft/30 px-3 py-2 text-sm leading-snug text-sp-navy-muted">
 &ldquo;{objection}&rdquo;
 </p>
 <p className="mt-2 text-xs text-sp-navy-muted">
 Your prep brief stays in the center — scroll it while you practice here.
 </p>
 </div>
 <button
 aria-label="Close practice"
 className="shrink-0 p-2 text-sp-navy-muted transition hover:bg-sp-blue-soft/40 hover:text-sp-navy"
 onClick={onClose}
 type="button"
 >
 <X className="h-5 w-5" />
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
