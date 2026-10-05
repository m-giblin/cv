"use client";

import { PlanBuilder } from "@/components/plans/plan-builder";
import type { Profile, UserPlan } from "@/lib/types";

/**
 * Legacy entry point kept for /plans. Plan templates are now authored in the Plan builder; the old
 * template form and per-template assign form were replaced by it and by Programs › Assign.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- props kept for the /plans call site
export function PlanManagementPanel(_props: {
  assignees: Profile[];
  mentors: Profile[];
  plans?: UserPlan[];
  profiles?: Profile[];
}) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-bg">
      <PlanBuilder />
    </div>
  );
}
