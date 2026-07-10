"use client";

import { Download, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminTabPageHeader } from "@/components/admin/admin-tab-page-header";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/types";

const AUDIT_COLS = "100px 140px 1fr 1fr 90px";

type AuditEntry = {
 id: string;
 actor_id: string | null;
 action: string;
 target_type: string;
 target_id: string | null;
 details: Record<string, unknown>;
 created_at: string;
};

function auditTypeBadge(action: string) {
 const lower = action.toLowerCase();
 if (lower.includes("user")) return { type: "User", typeBg: "#dbeafe", typeColor: "#1d4ed8" };
 if (lower.includes("plan")) return { type: "Plan", typeBg: "#e8f2fc", typeColor: "#0057a8" };
 if (lower.includes("sim")) return { type: "Sim", typeBg: "#fdf0fa", typeColor: "#a51e8e" };
 if (lower.includes("competency") || lower.includes("certification") || lower.includes("submission")) {
 return { type: "Review", typeBg: "#fef3c7", typeColor: "#b45309" };
 }
 if (lower.includes("ai") || lower.includes("coaching")) {
 return { type: "AI", typeBg: "#ede9fe", typeColor: "#5b21b6" };
 }
 if (lower.includes("platform") || lower.includes("development")) {
 return { type: "Config", typeBg: "#e0f2fe", typeColor: "#0369a1" };
 }
 return { type: "Admin", typeBg: "#ECEAE6", typeColor: "#6B6860" };
}

function resolveActorName(actorId: string | null, profiles: Profile[]): string {
 if (!actorId) {
 return "System";
 }

 const profile = profiles.find((item) => item.id === actorId);
 if (profile?.fullName) {
 return profile.fullName;
 }

 if (profile?.email) {
 return profile.email.split("@")[0] ?? actorId;
 }

 if (actorId.includes("@")) {
 return actorId.split("@")[0] ?? actorId;
 }

 return actorId.slice(0, 8);
}

export function AuditLogPanel({ profiles = [] }: { profiles?: Profile[] }) {
 const [logs, setLogs] = useState<AuditEntry[]>([]);
 const [isLoading, setIsLoading] = useState(true);

 const loadLogs = useCallback(async () => {
 setIsLoading(true);
 const response = await fetch("/api/admin/audit-log");

 if (!response.ok) {
 toast.error("Failed to load audit log.");
 setIsLoading(false);
 return;
 }

 const body = (await response.json()) as { logs: AuditEntry[] };
 setLogs(body.logs);
 setIsLoading(false);
 }, []);

 useEffect(() => {
 void loadLogs();
 }, [loadLogs]);

 return (
 <div className="space-y-4">
 <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
 <AdminTabPageHeader
 subtitle="Immutable record of admin, manager, and configuration actions across the platform."
 title="Audit Log"
 />
 <Button asChild className="shrink-0 self-start" size="sm" variant="outline">
 <a href="/api/admin/audit-log?format=csv">
 <Download className="h-4 w-4" />
 Export CSV
 </a>
 </Button>
 </div>

 {isLoading ? (
 <div className="flex justify-center py-8">
 <Loader2 className="h-6 w-6 animate-spin text-sp-blue" />
 </div>
 ) : (
 <div className="max-h-[480px] overflow-hidden overflow-y-auto border border-[#E2DFD9] bg-white">
 <div
 className="grid border-b border-[#ECEAE6] bg-[#F9F8F6] px-[18px] py-[10px]"
 style={{ gridTemplateColumns: AUDIT_COLS }}
 >
 {["Timestamp", "Actor", "Event", "Target", "Type"].map((header) => (
 <span className="text-[9.5px] font-bold uppercase tracking-[0.07em] text-[#A09D98]" key={header}>
 {header}
 </span>
 ))}
 </div>
 {logs.length === 0 ? (
 <p className="px-5 py-8 text-center text-sm text-[#A09D98]">No audit entries yet.</p>
 ) : (
 logs.map((log) => {
 const badge = auditTypeBadge(log.action);
 return (
 <div
 className="grid items-center border-b border-[#f9fafb] px-[18px] py-[9px] hover:bg-[#f7fafd]"
 key={log.id}
 style={{ gridTemplateColumns: AUDIT_COLS }}
 >
 <span className="text-[11px] tabular-nums text-[#A09D98]">
 {new Date(log.created_at).toLocaleString()}
 </span>
 <span className="truncate text-[11.5px] font-semibold text-[#3D3C38]">
 {resolveActorName(log.actor_id, profiles)}
 </span>
 <span className="truncate text-[11.5px] text-[#3D3C38]">{log.action}</span>
 <span className="truncate text-[11.5px] text-[#3D3C38]">
 {log.target_type}
 {log.target_id ? ` · ${log.target_id.slice(0, 8)}...` : ""}
 </span>
 <span
 className="w-fit font-mono text-[8px] uppercase tracking-[0.08em] px-[7px] py-[2px] text-[9.5px] font-bold"
 style={{ background: badge.typeBg, color: badge.typeColor }}
 >
 {badge.type}
 </span>
 </div>
 );
 })
 )}
 </div>
 )}
 </div>
 );
}
