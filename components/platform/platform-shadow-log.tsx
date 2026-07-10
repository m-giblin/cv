"use client";

import type { ShadowSession } from "@/lib/platform/mission-control-types";

export function PlatformShadowLog({
 sessions,
 onSelectTenant,
}: {
 sessions: ShadowSession[];
 onSelectTenant?: (tenantId: string) => void;
}) {
 if (sessions.length === 0) {
 return <p className="text-sm text-[#6B6860]">No shadow sessions in the selected window.</p>;
 }

 return (
 <div className="overflow-x-auto border border-[#E2DFD9] bg-white ">
 <table className="w-full text-left text-sm">
 <thead>
 <tr className="border-b border-[#E2DFD9] text-xs uppercase tracking-wide text-[#A09D98]">
 <th className="px-4 py-3">Operator</th>
 <th className="px-4 py-3">Tenant</th>
 <th className="px-4 py-3">Mode</th>
 <th className="px-4 py-3">Started</th>
 <th className="px-4 py-3">Duration</th>
 <th className="px-4 py-3">Status</th>
 </tr>
 </thead>
 <tbody>
 {sessions.map((session) => (
 <tr className="border-b border-[#f8fafc]" key={`${session.id}-${session.startedAt}`}>
 <td className="px-4 py-3">{session.actorName ?? session.actorId.slice(0, 8)}</td>
 <td className="px-4 py-3">
 {session.tenantId && onSelectTenant ? (
 <button
 className="font-medium text-[#0071ce] hover:underline"
 onClick={() => onSelectTenant(session.tenantId!)}
 type="button"
 >
 {session.tenantName ?? session.tenantId.slice(0, 8)}
 </button>
 ) : (
 (session.tenantName ?? "—")
 )}
 </td>
 <td className="px-4 py-3 text-[#6B6860]">{session.mode ?? "—"}</td>
 <td className="px-4 py-3 text-[#6B6860]">{new Date(session.startedAt).toLocaleString()}</td>
 <td className="px-4 py-3 text-[#6B6860]">
 {session.durationMinutes != null ? `${session.durationMinutes}m` : "—"}
 </td>
 <td className="px-4 py-3">
 <span
 className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
 session.active ? "bg-green-100 text-green-800" : "bg-[#ECEAE6] text-[#6B6860]"
 }`}
 >
 {session.active ? "Active" : "Ended"}
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 );
}
