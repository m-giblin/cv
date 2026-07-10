"use client";

import { Loader2, ScrollText } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { PlatformAuditEntry } from "@/lib/tenant/types";

export function PlatformGlobalAuditPanel({ tenantId }: { tenantId?: string | null }) {
 const [logs, setLogs] = useState<PlatformAuditEntry[]>([]);
 const [loading, setLoading] = useState(true);

 const load = useCallback(async () => {
 setLoading(true);
 const params = new URLSearchParams({ limit: "200" });
 if (tenantId) params.set("tenantId", tenantId);
 const response = await fetch(`/api/platform/audit-logs?${params.toString()}`);
 setLoading(false);
 if (!response.ok) {
 toast.error("Could not load audit log.");
 return;
 }
 const body = (await response.json()) as { logs: PlatformAuditEntry[] };
 setLogs(body.logs ?? []);
 }, [tenantId]);

 useEffect(() => {
 void load();
 }, [load]);

 if (loading) {
 return (
 <div className="flex justify-center py-16">
 <Loader2 className="h-7 w-7 animate-spin text-[#0071ce]" />
 </div>
 );
 }

 return (
 <div className="border border-[#E2DFD9] bg-white p-5 ">
 <div className="mb-4 flex items-center gap-2">
 <ScrollText className="h-4 w-4 text-[#0071ce]" />
 <h3 className="text-base font-bold text-[#0D0E12]">
 {tenantId ? "Tenant audit log" : "Global audit log"}
 </h3>
 </div>
 {logs.length === 0 ? (
 <p className="text-sm text-[#6B6860]">No audit events yet.</p>
 ) : (
 <div className="max-h-[560px] overflow-y-auto">
 <table className="w-full text-left text-sm">
 <thead>
 <tr className="border-b border-[#E2DFD9] text-xs uppercase tracking-wide text-[#A09D98]">
 <th className="py-2 pr-3">When</th>
 <th className="py-2 pr-3">Tenant</th>
 <th className="py-2 pr-3">Actor</th>
 <th className="py-2 pr-3">Action</th>
 <th className="py-2">Target</th>
 </tr>
 </thead>
 <tbody>
 {logs.map((entry) => (
 <tr className="border-b border-[#f8fafc]" key={entry.id}>
 <td className="py-2 pr-3 text-[#6B6860]">{new Date(entry.createdAt).toLocaleString()}</td>
 <td className="py-2 pr-3 text-[#6B6860]">{entry.tenantId?.slice(0, 8) ?? "—"}</td>
 <td className="py-2 pr-3">{entry.actorName ?? "—"}</td>
 <td className="py-2 pr-3 font-medium text-[#0D0E12]">{entry.action}</td>
 <td className="py-2 text-[#6B6860]">
 {entry.targetType}
 {entry.targetId ? ` · ${entry.targetId.slice(0, 8)}` : ""}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>
 );
}
