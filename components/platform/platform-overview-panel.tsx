"use client";

import { AlertTriangle, Loader2, Ticket } from "lucide-react";
import type { SupportRequest } from "@/lib/tenant/types";
import type { TenantHealth } from "@/lib/tenant/types";

type OverviewData = {
 summary: {
 tenantCount: number;
 totalOpenTickets: number;
 tenantsNeedingAttention: number;
 };
 health: TenantHealth[];
 recentTickets: SupportRequest[];
};

function formatRelative(iso: string | null | undefined): string {
 if (!iso) return "—";
 const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
 if (days === 0) return "today";
 if (days === 1) return "1d ago";
 return `${days}d ago`;
}

export function PlatformOverviewPanel({
 data,
 healthWithActivity,
 loading,
 onSelectTenant,
 onOpenSupport,
}: {
 data: OverviewData | null;
 healthWithActivity?: TenantHealth[];
 loading: boolean;
 onSelectTenant: (tenantId: string) => void;
 onOpenSupport: () => void;
}) {
 if (loading) {
 return (
 <div className="flex justify-center py-16">
 <Loader2 className="h-7 w-7 animate-spin text-[#0071ce]" />
 </div>
 );
 }

 if (!data) {
 return <p className="text-sm text-[#6B6860]">Could not load platform overview.</p>;
 }

 const { summary, health, recentTickets } = data;
 const healthRows = healthWithActivity ?? health;
 const attentionTenants = health.filter((item) => item.alerts.length > 0);

 return (
 <div className="space-y-5">
 <div className="grid gap-3 sm:grid-cols-3">
 <div className="border border-[#E2DFD9] bg-white p-4 ">
 <p className="text-2xl font-bold text-[#0D0E12]">{summary.tenantCount}</p>
 <p className="text-xs text-[#6B6860]">Active organizations</p>
 </div>
 <button
 className="border border-[#E2DFD9] bg-white p-4 text-left transition hover:border-[#0071ce]"
 onClick={onOpenSupport}
 type="button"
 >
 <p className="text-2xl font-bold text-[#0D0E12]">{summary.totalOpenTickets}</p>
 <p className="text-xs text-[#6B6860]">Open support tickets</p>
 </button>
 <div className="border border-[#E2DFD9] bg-white p-4 ">
 <p className="text-2xl font-bold text-[#0D0E12]">{summary.tenantsNeedingAttention}</p>
 <p className="text-xs text-[#6B6860]">Tenants needing attention</p>
 </div>
 </div>

 {attentionTenants.length > 0 ? (
 <div className="border border-amber-200 bg-amber-50 p-4">
 <div className="mb-3 flex items-center gap-2 text-amber-900">
 <AlertTriangle className="h-4 w-4" />
 <h3 className="text-sm font-bold">Alerts</h3>
 </div>
 <div className="space-y-2">
 {attentionTenants.map((item) => (
 <button
 className="flex w-full items-start justify-between gap-3 bg-white px-3 py-2 text-left text-sm transition hover:bg-amber-50/50"
 key={item.tenantId}
 onClick={() => onSelectTenant(item.tenantId)}
 type="button"
 >
 <div>
 <p className="font-semibold text-[#0D0E12]">{item.name}</p>
 <p className="text-xs text-[#6B6860]">{item.alerts.join(" · ")}</p>
 </div>
 <span className="shrink-0 text-xs uppercase text-[#A09D98]">{item.status}</span>
 </button>
 ))}
 </div>
 </div>
 ) : null}

 <div className="border border-[#E2DFD9] bg-white p-5 ">
 <h3 className="mb-3 text-base font-bold text-[#0D0E12]">Tenant health</h3>
 <div className="overflow-x-auto">
 <table className="w-full text-left text-sm">
 <thead>
 <tr className="border-b border-[#E2DFD9] text-xs uppercase tracking-wide text-[#A09D98]">
 <th className="py-2 pr-3">Tenant</th>
 <th className="py-2 pr-3">Users</th>
 <th className="py-2 pr-3">AI (30d)</th>
 <th className="py-2 pr-3">Tickets</th>
 <th className="py-2 pr-3">Last activity</th>
 <th className="py-2 pr-3">Last AI</th>
 <th className="py-2">Status</th>
 </tr>
 </thead>
 <tbody>
 {healthRows.map((item) => (
 <tr
 className="cursor-pointer border-b border-[#f8fafc] hover:bg-[#F9F8F6]"
 key={item.tenantId}
 onClick={() => onSelectTenant(item.tenantId)}
 >
 <td className="py-2 pr-3 font-medium text-[#0D0E12]">{item.name}</td>
 <td className="py-2 pr-3 text-[#6B6860]">{item.userCount}</td>
 <td className="py-2 pr-3 text-[#6B6860]">{item.aiCalls30d}</td>
 <td className="py-2 pr-3 text-[#6B6860]">{item.openSupportTickets}</td>
 <td className="py-2 pr-3 text-[#6B6860]">{formatRelative(item.lastUserActivityAt)}</td>
 <td className="py-2 pr-3 text-[#6B6860]">{formatRelative(item.lastAiCallAt)}</td>
 <td className="py-2 text-[#6B6860]">{item.status}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

 {recentTickets.length > 0 ? (
 <div className="border border-[#E2DFD9] bg-white p-5 ">
 <div className="mb-3 flex items-center justify-between gap-2">
 <div className="flex items-center gap-2">
 <Ticket className="h-4 w-4 text-[#0071ce]" />
 <h3 className="text-base font-bold text-[#0D0E12]">Recent support tickets</h3>
 </div>
 <button className="text-xs font-semibold text-[#0071ce] hover:underline" onClick={onOpenSupport} type="button">
 View all
 </button>
 </div>
 <div className="space-y-2">
 {recentTickets.map((ticket) => (
 <div className="border border-[#ECEAE6] px-3 py-2 text-sm" key={ticket.id}>
 <p className="font-medium text-[#0D0E12]">{ticket.subject}</p>
 <p className="text-xs text-[#A09D98]">
 {ticket.tenantName ?? "Unknown"} · {ticket.priority} · {ticket.status}
 </p>
 </div>
 ))}
 </div>
 </div>
 ) : null}
 </div>
 );
}
