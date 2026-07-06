"use client";

import { Download, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
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
  if (lower.includes("ai") || lower.includes("coaching")) {
    return { type: "AI", typeBg: "#ede9fe", typeColor: "#5b21b6" };
  }
  return { type: "Admin", typeBg: "#f1f5f9", typeColor: "#64748b" };
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
        <div>
          <h2 className="text-[12.5px] font-bold text-[#0a1628]">Audit log</h2>
          <p className="text-[11px] text-[#64748b]">Immutable record of admin and plan management actions.</p>
        </div>
        <Button asChild size="sm" variant="outline">
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
        <div className="max-h-[480px] overflow-hidden overflow-y-auto rounded-xl border border-[#e2eaf5] bg-white">
          <div
            className="grid border-b border-[#f1f5f9] bg-[#f8fafd] px-[18px] py-[10px]"
            style={{ gridTemplateColumns: AUDIT_COLS }}
          >
            {["Timestamp", "Actor", "Event", "Target", "Type"].map((header) => (
              <span className="text-[9.5px] font-bold uppercase tracking-[0.07em] text-[#94a3b8]" key={header}>
                {header}
              </span>
            ))}
          </div>
          {logs.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-[#94a3b8]">No audit entries yet.</p>
          ) : (
            logs.map((log) => {
              const badge = auditTypeBadge(log.action);
              return (
                <div
                  className="grid items-center border-b border-[#f9fafb] px-[18px] py-[9px] hover:bg-[#f7fafd]"
                  key={log.id}
                  style={{ gridTemplateColumns: AUDIT_COLS }}
                >
                  <span className="text-[11px] tabular-nums text-[#94a3b8]">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                  <span className="truncate text-[11.5px] font-semibold text-[#1e293b]">
                    {resolveActorName(log.actor_id, profiles)}
                  </span>
                  <span className="truncate text-[11.5px] text-[#475569]">{log.action}</span>
                  <span className="truncate text-[11.5px] text-[#475569]">
                    {log.target_type}
                    {log.target_id ? ` · ${log.target_id.slice(0, 8)}...` : ""}
                  </span>
                  <span
                    className="w-fit rounded-full px-[7px] py-[2px] text-[9.5px] font-bold"
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
