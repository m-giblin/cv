"use client";

import { AlertTriangle, Clock, Loader2, Radio, Wrench } from "lucide-react";
import type { MissionControlNow } from "@/lib/platform/mission-control-types";
import type { SupportRequest } from "@/lib/tenant/types";

export function PlatformNowPanel({
 data,
 loading,
 onOpenSupport,
 onSelectTenant,
 onOpenShadow,
}: {
 data: MissionControlNow | null;
 loading: boolean;
 onOpenSupport: () => void;
 onSelectTenant: (tenantId: string) => void;
 onOpenShadow: () => void;
}) {
 if (loading) {
 return (
 <div className="flex justify-center py-16">
 <Loader2 className="h-7 w-7 animate-spin text-[#0071ce]" />
 </div>
 );
 }

 if (!data) {
 return <p className="text-sm text-[#6B6860]">Could not load mission control.</p>;
 }

 const { summary, criticalTickets, recentAlerts, maintenanceTenants } = data;

 return (
 <div className="space-y-5">
 <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
 {[
 { label: "Open tickets", value: summary.openTickets, onClick: onOpenSupport },
 { label: "SLA breached", value: summary.slaBreached, alert: summary.slaBreached > 0 },
 { label: "Tenants w/ alerts", value: summary.tenantsNeedingAttention },
 { label: "Active shadows", value: summary.activeShadowSessions, onClick: onOpenShadow },
 ].map((item) => (
 <button
 className={`border bg-white p-4 text-left ${
 item.alert ? "border-red-200 bg-red-50" : "border-[#E2DFD9]"
 }`}
 key={item.label}
 onClick={item.onClick}
 type={item.onClick ? "button" : "button"}
 >
 <p className="text-2xl font-bold text-[#0D0E12]">{item.value}</p>
 <p className="text-xs text-[#6B6860]">{item.label}</p>
 </button>
 ))}
 </div>

 {maintenanceTenants.length > 0 ? (
 <div className="border border-amber-200 bg-amber-50 p-4">
 <div className="mb-2 flex items-center gap-2 text-amber-900">
 <Wrench className="h-4 w-4" />
 <h3 className="text-sm font-bold">Maintenance mode</h3>
 </div>
 {maintenanceTenants.map((t) => (
 <button
 className="block w-full px-2 py-1.5 text-left text-sm hover:bg-white/60"
 key={t.tenantId}
 onClick={() => onSelectTenant(t.tenantId)}
 type="button"
 >
 <span className="font-semibold">{t.name}</span>
 {t.message ? <span className="text-[#6B6860]"> — {t.message}</span> : null}
 </button>
 ))}
 </div>
 ) : null}

 <div className="border border-[#E2DFD9] bg-white p-5 ">
 <div className="mb-3 flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Clock className="h-4 w-4 text-[#0071ce]" />
 <h3 className="text-base font-bold text-[#0D0E12]">Needs attention now</h3>
 </div>
 <button className="text-xs font-semibold text-[#0071ce] hover:underline" onClick={onOpenSupport} type="button">
 Open inbox
 </button>
 </div>
 {criticalTickets.length === 0 ? (
 <p className="text-sm text-[#6B6860]">No critical or SLA-breached tickets.</p>
 ) : (
 <div className="space-y-2">
 {criticalTickets.map((ticket: SupportRequest & { slaLabel: string; slaBreached: boolean }) => (
 <div
 className={`border px-3 py-2 text-sm ${ticket.slaBreached ? "border-red-200 bg-red-50" : "border-[#ECEAE6]"}`}
 key={ticket.id}
 >
 <p className="font-semibold text-[#0D0E12]">{ticket.subject}</p>
 <p className="text-xs text-[#A09D98]">
 {ticket.tenantName} · {ticket.priority} · {ticket.slaLabel}
 </p>
 </div>
 ))}
 </div>
 )}
 </div>

 {recentAlerts.length > 0 ? (
 <div className="border border-[#E2DFD9] bg-white p-5 ">
 <div className="mb-3 flex items-center gap-2">
 <AlertTriangle className="h-4 w-4 text-amber-600" />
 <h3 className="text-base font-bold text-[#0D0E12]">Tenant alerts</h3>
 </div>
 <div className="space-y-2">
 {recentAlerts.map((item) => (
 <button
 className="flex w-full items-center justify-between border border-[#ECEAE6] px-3 py-2 text-left text-sm hover:bg-[#F9F8F6]"
 key={item.tenantId}
 onClick={() => onSelectTenant(item.tenantId)}
 type="button"
 >
 <div>
 <p className="font-semibold text-[#0D0E12]">{item.name}</p>
 <p className="text-xs text-[#6B6860]">{item.alerts.join(" · ")}</p>
 </div>
 <Radio className="h-3 w-3 shrink-0 text-[#A09D98]" />
 </button>
 ))}
 </div>
 </div>
 ) : null}
 </div>
 );
}
