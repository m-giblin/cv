"use client";

import { ScrollText } from "lucide-react";
import type { OperatorDigestEntry } from "@/lib/platform/mission-control-types";

export function PlatformOperatorDigest({ entries }: { entries: OperatorDigestEntry[] }) {
 if (entries.length === 0) {
 return <p className="text-sm text-[#6B6860]">No operator actions in the last 24 hours.</p>;
 }

 return (
 <div className="border border-[#E2DFD9] bg-white p-5 ">
 <div className="mb-3 flex items-center gap-2">
 <ScrollText className="h-4 w-4 text-[#0071ce]" />
 <h3 className="text-base font-bold text-[#0D0E12]">Operator activity (24h)</h3>
 </div>
 <div className="max-h-[320px] space-y-2 overflow-y-auto">
 {entries.map((entry) => (
 <div className="border border-[#ECEAE6] px-3 py-2 text-sm" key={entry.id}>
 <p className="font-medium text-[#0D0E12]">{entry.action}</p>
 <p className="text-xs text-[#A09D98]">
 {entry.actorName ?? "Operator"} · {entry.hoursAgo}h ago
 {entry.tenantId ? ` · tenant ${entry.tenantId.slice(0, 8)}` : ""}
 </p>
 </div>
 ))}
 </div>
 </div>
 );
}
