"use client";

import { ManagerPlanAssignPanel } from "@/components/manager/manager-plan-assign-panel";
import { planIsComplete } from "@/lib/plans/ramp-week";
import type { Profile, UserPlan } from "@/lib/types";
import { initials } from "@/lib/utils";

const CARD = "rounded-xl border border-[#e2eaf5] bg-white shadow-[0_1px_4px_rgba(0,20,58,0.04)]";

export function ManagerAssignPlansSection({
  assignees,
  mentors,
  plans,
  org,
}: {
  assignees: Profile[];
  mentors: Profile[];
  plans: UserPlan[];
  org: Profile[];
}) {
  const orgIds = new Set(org.map((profile) => profile.id));
  const orgPlans = plans.filter((plan) => orgIds.has(plan.userId));

  return (
    <div className="grid gap-[14px] xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <ManagerPlanAssignPanel assignees={assignees} mentors={mentors} plans={plans} />

      <div className={CARD}>
        <div className="border-b border-[#f1f5f9] p-[16px_18px]">
          <p className="text-[12.5px] font-bold text-[#0a1628]">Active assignments</p>
          <p className="text-[10.5px] text-[#94a3b8]">{orgPlans.length} plans across your team</p>
        </div>
        <div className="max-h-[520px] divide-y divide-[#f1f5f9] overflow-y-auto">
          {orgPlans.length === 0 ? (
            <p className="p-[18px] text-sm text-[#64748b]">Assign a ramp template to get started.</p>
          ) : (
            orgPlans.map((plan) => {
              const person = org.find((profile) => profile.id === plan.userId);
              const done = planIsComplete(plan);
              return (
                <div className="flex items-center justify-between gap-3 px-[18px] py-[12px]" key={plan.id}>
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f0f7ff] text-[10px] font-bold text-[#0071ce]">
                      {initials(person?.fullName ?? "?")}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-semibold text-[#0a1628]">{person?.fullName ?? "SE"}</p>
                      <p className="truncate text-[10px] text-[#94a3b8]">{plan.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] font-bold text-[#0071ce]">{plan.progress}%</p>
                    <p className="text-[9.5px] font-semibold" style={{ color: done ? "#15803d" : "#b45309" }}>
                      {done ? "Complete" : "Active"}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
