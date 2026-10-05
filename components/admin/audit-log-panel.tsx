"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminTable, EmptyState, LoadingState, Mono, Td, Th } from "@/components/admin/admin-ui";
import { Chip } from "@/components/ui/chip";
import { Tag } from "@/components/ui/tag";
import type { Profile } from "@/lib/types";

type AuditEntry = {
 id: string;
 actor_id: string | null;
 action: string;
 target_type: string;
 target_id: string | null;
 details: Record<string, unknown>;
 created_at: string;
};

const AUDIT_TYPES = ["User", "Plan", "Sim", "Review", "AI", "Config", "Admin"] as const;
type AuditType = (typeof AUDIT_TYPES)[number];

function auditType(action: string): AuditType {
 const lower = action.toLowerCase();
 if (lower.includes("user")) return "User";
 if (lower.includes("plan")) return "Plan";
 if (lower.includes("sim")) return "Sim";
 if (lower.includes("competency") || lower.includes("certification") || lower.includes("submission")) {
 return "Review";
 }
 if (lower.includes("ai") || lower.includes("coaching")) {
 return "AI";
 }
 if (lower.includes("platform") || lower.includes("development")) {
 return "Config";
 }
 return "Admin";
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
 const [typeFilter, setTypeFilter] = useState<AuditType | "All">("All");

 const visibleLogs = useMemo(
 () => (typeFilter === "All" ? logs : logs.filter((log) => auditType(log.action) === typeFilter)),
 [logs, typeFilter],
 );

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
 <div className="flex flex-col gap-6">
 <div className="flex flex-wrap items-center justify-between gap-3">
 <div aria-label="Filter by event type" className="flex flex-wrap gap-2" role="group">
 {(["All", ...AUDIT_TYPES] as const).map((option) => (
 <Chip active={typeFilter === option} key={option} onClick={() => setTypeFilter(option)}>
 {option}
 </Chip>
 ))}
 </div>
 <a className="btn-secondary inline-flex items-center gap-1.5" href="/api/admin/audit-log?format=csv">
 Export CSV
 </a>
 </div>

 {isLoading ? (
 <LoadingState label="Loading audit log…" />
 ) : (
 <AdminTable caption="Audit log" minWidth={820}>
 <thead>
 <tr>
 <Th>Timestamp</Th>
 <Th>Actor</Th>
 <Th>Event</Th>
 <Th>Target</Th>
 <Th>Type</Th>
 </tr>
 </thead>
 <tbody>
 {visibleLogs.length === 0 ? (
 <tr>
 <td colSpan={5}>
 <EmptyState>{logs.length === 0 ? "No audit entries yet." : "No entries of this type."}</EmptyState>
 </td>
 </tr>
 ) : (
 visibleLogs.map((log) => (
 <tr className="hover:bg-surface-2" key={log.id}>
 <Td className="whitespace-nowrap">
 <Mono className="tabular-nums">{new Date(log.created_at).toLocaleString()}</Mono>
 </Td>
 <Td className="max-w-[180px] truncate text-sm font-bold">
 {resolveActorName(log.actor_id, profiles)}
 </Td>
 <Td className="max-w-[260px] truncate font-mono text-[13px]">{log.action}</Td>
 <Td className="max-w-[220px] truncate text-sm text-ink-2">
 {log.target_type}
 {log.target_id ? ` · ${log.target_id.slice(0, 8)}…` : ""}
 </Td>
 <Td>
 <Tag>{auditType(log.action)}</Tag>
 </Td>
 </tr>
 ))
 )}
 </tbody>
 </AdminTable>
 )}
 </div>
 );
}
