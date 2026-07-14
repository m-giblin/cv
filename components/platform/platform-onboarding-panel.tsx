"use client";

import type { OnboardingFunnelEntry } from "@/lib/platform/mission-control-types";
import { ONBOARDING_STAGE_LABELS } from "@/lib/platform/mission-control-types";

const STAGES = ["created", "admin_invited", "admin_accepted", "has_users", "first_activity"] as const;

export function PlatformOnboardingPanel({
 entries,
 onSelectTenant,
}: {
 entries: OnboardingFunnelEntry[];
 onSelectTenant: (tenantId: string) => void;
}) {
 const incomplete = entries.filter((e) => e.stage !== "first_activity");

 return (
 <div className="space-y-4">
 <p className="text-sm text-[#6B6860]">
 {incomplete.length} tenant{incomplete.length === 1 ? "" : "s"} still onboarding.
 </p>
 <div className="overflow-x-auto border border-[#E2DFD9] bg-white ">
 <table className="w-full text-left text-sm">
 <thead>
 <tr className="border-b border-[#E2DFD9] text-xs uppercase tracking-wide text-[#A09D98]">
 <th className="px-4 py-3">Tenant</th>
 <th className="px-4 py-3">Stage</th>
 <th className="px-4 py-3">Users</th>
 <th className="px-4 py-3">Created</th>
 <th className="px-4 py-3">Progress</th>
 </tr>
 </thead>
 <tbody>
 {entries.map((entry) => (
 <tr
 className="cursor-pointer border-b border-[#f8fafc] hover:bg-[#F9F8F6]"
 key={entry.tenantId}
 onClick={() => onSelectTenant(entry.tenantId)}
 >
 <td className="px-4 py-3 font-medium text-[#0D0E12]">{entry.name}</td>
 <td className="px-4 py-3 text-[#6B6860]">{ONBOARDING_STAGE_LABELS[entry.stage]}</td>
 <td className="px-4 py-3 text-[#6B6860]">{entry.userCount}</td>
 <td className="px-4 py-3 text-[#6B6860]">{new Date(entry.createdAt).toLocaleDateString()}</td>
 <td className="px-4 py-3">
 <div className="flex gap-1">
 {STAGES.map((stage, index) => (
 <span
 className={`h-2 w-6 rounded-full ${index <= entry.stageIndex ? "bg-[#0071ce]" : "bg-[#E2DFD9]"}`}
 key={stage}
 title={ONBOARDING_STAGE_LABELS[stage]}
 />
 ))}
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 );
}
