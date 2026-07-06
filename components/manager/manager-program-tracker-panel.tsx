"use client";

import Link from "next/link";
import { buildProgramTrackerRows, planIsComplete } from "@/lib/plans/ramp-week";
import type { Profile, UserPlan } from "@/lib/types";
import { initials } from "@/lib/utils";

const CARD = "rounded-xl border border-[#e2eaf5] bg-white shadow-[0_1px_4px_rgba(0,20,58,0.04)]";

export function ManagerProgramTrackerPanel({
  org,
  plans,
}: {
  org: Profile[];
  plans: UserPlan[];
}) {
  const teamIds = org.map((profile) => profile.id);
  const rows = buildProgramTrackerRows(teamIds, plans);
  const activePlans = plans.filter((plan) => teamIds.includes(plan.userId));
  const completeCount = activePlans.filter(planIsComplete).length;
  const inProgress = activePlans.length - completeCount;
  const avgProgress =
    activePlans.length > 0
      ? Math.round(activePlans.reduce((sum, plan) => sum + plan.progress, 0) / activePlans.length)
      : 0;

  return (
    <div className="space-y-[14px]">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className={`${CARD} border-l-[3px] border-l-[#0071ce] p-[14px_16px]`}>
          <p className="text-[10px] font-semibold text-[#64748b]">Active ramp plans</p>
          <p className="font-display text-[26px] font-extrabold leading-none text-[#0a1628]">{activePlans.length}</p>
        </div>
        <div className={`${CARD} border-l-[3px] border-l-[#10b981] p-[14px_16px]`}>
          <p className="text-[10px] font-semibold text-[#64748b]">Completed</p>
          <p className="font-display text-[26px] font-extrabold leading-none text-[#0a1628]">{completeCount}</p>
        </div>
        <div className={`${CARD} border-l-[3px] border-l-[#cc27b0] p-[14px_16px]`}>
          <p className="text-[10px] font-semibold text-[#64748b]">Team avg progress</p>
          <p className="font-display text-[26px] font-extrabold leading-none text-[#0a1628]">{avgProgress}%</p>
        </div>
      </div>

      <div className={CARD}>
        <div className="border-b border-[#f1f5f9] p-[16px_18px]">
          <p className="text-[12.5px] font-bold text-[#0a1628]">Ramp stage completion</p>
          <p className="text-[10.5px] text-[#94a3b8]">Progress by onboarding week template across your team</p>
        </div>
        <div className="space-y-4 p-[16px_18px]">
          {rows.length === 0 ? (
            <p className="text-sm text-[#64748b]">
              No ramp plans assigned yet.{" "}
              <Link className="font-semibold text-[#0071ce] hover:underline" href="/manager?section=assign">
                Assign plans →
              </Link>
            </p>
          ) : (
            rows.map((row) => {
              const pct = row.assigned > 0 ? Math.round((row.complete / row.assigned) * 100) : 0;
              return (
                <div key={row.stageName}>
                  <div className="mb-1 flex justify-between gap-2 text-[11px]">
                    <span className="font-semibold text-[#0a1628]">
                      {row.shortLabel} — {row.stageName.replace(/^Week\s+\d+[–-]\d+\s*—\s*/i, "")}
                    </span>
                    <span className="shrink-0 text-[#64748b]">
                      {row.complete}/{row.assigned || row.teamSize} complete
                    </span>
                  </div>
                  <div className="h-[6px] overflow-hidden rounded-full bg-[#e8f2fc]">
                    <div className="h-full rounded-full bg-[#0071ce] transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className={CARD}>
        <div className="border-b border-[#f1f5f9] p-[16px_18px]">
          <p className="text-[12.5px] font-bold text-[#0a1628]">SE plan status</p>
        </div>
        <div className="divide-y divide-[#f1f5f9]">
          {org.map((person) => {
            const plan = activePlans.find((item) => item.userId === person.id);
            const progress = plan?.progress ?? 0;
            const status = plan ? (planIsComplete(plan) ? "Complete" : "In progress") : "Unassigned";
            const statusBg = status === "Complete" ? "#dcfce7" : status === "In progress" ? "#dbeafe" : "#f1f5f9";
            const statusColor = status === "Complete" ? "#15803d" : status === "In progress" ? "#1d4ed8" : "#64748b";
            return (
              <div className="grid grid-cols-[1fr_120px_90px_80px] items-center gap-3 px-[18px] py-[11px] text-[11.5px]" key={person.id}>
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e8f2fc] text-[10px] font-bold text-[#0071ce]">
                    {initials(person.fullName)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#0a1628]">{person.fullName}</p>
                    <p className="truncate text-[10px] text-[#94a3b8]">{plan?.name ?? "No plan assigned"}</p>
                  </div>
                </div>
                <div className="h-[5px] overflow-hidden rounded-full bg-[#f1f5f9]">
                  <div className="h-full rounded-full bg-[#0071ce]" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-right font-semibold text-[#0071ce]">{progress}%</span>
                <span className="rounded-full px-2 py-0.5 text-center text-[9.5px] font-bold" style={{ background: statusBg, color: statusColor }}>
                  {status}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
