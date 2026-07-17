"use client";

import { ChevronDown, ChevronRight, Loader2, RefreshCw, ScrollText, ShieldCheck } from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { PlatformAuditEntry } from "@/lib/tenant/types";

function summarizeDetails(entry: PlatformAuditEntry): string | null {
  const d = entry.details ?? {};
  if (entry.action === "tenant.feature_flags.updated") {
    const pkg = typeof d.packageId === "string" ? d.packageId : "custom";
    return `package: ${pkg}${d.billingPlan ? ` · plan: ${String(d.billingPlan)}` : ""}`;
  }
  if (entry.action === "workspace.hat_switched") {
    return `${String(d.from ?? "—")} → ${String(d.to ?? "—")}`;
  }
  if (entry.action === "tenant.maintenance_updated") {
    return d.maintenanceMode ? "maintenance on" : "maintenance off";
  }
  if (entry.action === "tenant.bulk_operation") {
    return `${String(d.action ?? "")}${d.presetId ? ` · ${String(d.presetId)}` : ""} · ok ${String(d.okCount ?? 0)}`;
  }
  if (entry.action === "operator.impersonation_started") {
    return `user ${entry.targetId?.slice(0, 8) ?? "—"}`;
  }
  if (entry.action === "tenant.shadow_started" || entry.action === "tenant.shadow_ended") {
    return `mode: ${String(d.mode ?? "—")}`;
  }
  const keys = Object.keys(d);
  if (keys.length === 0) return null;
  return keys.slice(0, 4).join(", ");
}

export function PlatformGlobalAuditPanel({ tenantId }: { tenantId?: string | null }) {
  const [logs, setLogs] = useState<PlatformAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [probing, setProbing] = useState(false);
  const [platformOpsOnly, setPlatformOpsOnly] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [writeHealth, setWriteHealth] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "200" });
    if (tenantId) params.set("tenantId", tenantId);
    if (platformOpsOnly) params.set("platformOpsOnly", "1");
    const response = await fetch(`/api/platform/audit-logs?${params.toString()}`);
    setLoading(false);
    if (!response.ok) {
      toast.error("Could not load audit log.");
      return;
    }
    const body = (await response.json()) as { logs: PlatformAuditEntry[] };
    setLogs(body.logs ?? []);
  }, [tenantId, platformOpsOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  async function probeWrite() {
    setProbing(true);
    const response = await fetch("/api/platform/audit-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: tenantId ?? null }),
    });
    setProbing(false);
    const body = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      via?: string;
      error?: string;
      readable?: boolean;
    };
    if (!response.ok || !body.ok) {
      setWriteHealth(body.error ?? "Write probe failed");
      toast.error(body.error ?? "Audit write probe failed.");
      return;
    }
    setWriteHealth(`Write OK via ${body.via ?? "unknown"}${body.readable ? " · readable" : ""}`);
    toast.success(`Audit write healthy (${body.via})`);
    await load();
  }

  const newest = useMemo(() => (logs[0] ? new Date(logs[0].createdAt).toLocaleString() : null), [logs]);

  return (
    <div className="border border-[#E2DFD9] bg-white p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-[#0071ce]" />
            <h3 className="text-sm font-bold text-[#0D0E12]">
              {tenantId ? "Tenant audit log" : "Global audit log"}
            </h3>
          </div>
          <p className="mt-1 text-xs text-[#6B6860]">
            {logs.length} events
            {newest ? ` · newest ${newest}` : ""}
            {writeHealth ? ` · ${writeHealth}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-[#3D3C38]">
            <input
              checked={platformOpsOnly}
              onChange={(event) => setPlatformOpsOnly(event.target.checked)}
              type="checkbox"
            />
            Platform ops only
          </label>
          <Button disabled={probing} onClick={() => void probeWrite()} size="sm" type="button" variant="outline">
            {probing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            Test write
          </Button>
          <Button disabled={loading} onClick={() => void load()} size="sm" type="button" variant="outline">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-[#0071ce]" />
        </div>
      ) : logs.length === 0 ? (
        <p className="text-sm text-[#6B6860]">
          No audit events yet. Use <span className="font-medium">Test write</span> to verify the pipeline.
        </p>
      ) : (
        <div className="max-h-[560px] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#E2DFD9] text-xs uppercase tracking-wide text-[#A09D98]">
                <th className="py-2 pr-2 w-6" />
                <th className="py-2 pr-3">When</th>
                <th className="py-2 pr-3">Tenant</th>
                <th className="py-2 pr-3">Actor</th>
                <th className="py-2 pr-3">Action</th>
                <th className="py-2">Summary</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((entry) => {
                const open = expandedId === entry.id;
                const summary = summarizeDetails(entry);
                return (
                  <Fragment key={entry.id}>
                    <tr className="border-b border-[#f8fafc]">
                      <td className="py-2 pr-2">
                        <button
                          aria-label="Toggle details"
                          className="text-[#A09D98] hover:text-[#3D3C38]"
                          onClick={() => setExpandedId(open ? null : entry.id)}
                          type="button"
                        >
                          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </button>
                      </td>
                      <td className="whitespace-nowrap py-2 pr-3 text-[#6B6860]">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2 pr-3 text-[#6B6860]">
                        {entry.tenantName ?? (entry.tenantId ? entry.tenantId.slice(0, 8) : "—")}
                      </td>
                      <td className="py-2 pr-3">{entry.actorName ?? "—"}</td>
                      <td className="py-2 pr-3 font-medium text-[#0D0E12]">{entry.action}</td>
                      <td className="py-2 text-[#6B6860]">{summary ?? entry.targetType}</td>
                    </tr>
                    {open ? (
                      <tr className="border-b border-[#f8fafc] bg-[#F9F8F6]">
                        <td className="p-3" colSpan={6}>
                          <pre className="overflow-x-auto text-[11px] leading-relaxed text-[#3D3C38]">
                            {JSON.stringify(
                              {
                                targetType: entry.targetType,
                                targetId: entry.targetId,
                                tenantId: entry.tenantId,
                                details: entry.details,
                              },
                              null,
                              2,
                            )}
                          </pre>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
