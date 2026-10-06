"use client";

import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  EmptyLine,
  Spinner,
  TABLE,
  TABLE_WRAP,
  TD,
  TD_META,
  TD_MUTED,
  TH,
  THEAD_ROW,
  TR,
  formatDateTime,
} from "@/components/platform/platform-ui";
import { Chip } from "@/components/ui/chip";
import { rowHighlight } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { PlatformAuditEntry } from "@/lib/tenant/types";

function summarizeDetails(entry: PlatformAuditEntry): string | null {
  const d = entry.details ?? {};
  if (entry.action === "tenant.feature_flags.updated") {
    const pkg = typeof d.packageId === "string" ? d.packageId : "custom";
    return `package: ${pkg}${d.billingPlan ? `, plan: ${String(d.billingPlan)}` : ""}`;
  }
  if (entry.action === "workspace.hat_switched") {
    return `from ${String(d.from ?? "—")} to ${String(d.to ?? "—")}`;
  }
  if (entry.action === "tenant.maintenance_updated") {
    return d.maintenanceMode ? "maintenance on" : "maintenance off";
  }
  if (entry.action === "tenant.bulk_operation") {
    return `${String(d.action ?? "")}${d.presetId ? ` (${String(d.presetId)})` : ""}, ${String(d.okCount ?? 0)} succeeded`;
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
    setWriteHealth(`Write OK via ${body.via ?? "unknown"}${body.readable ? ", readable" : ""}`);
    toast.success(`Audit write healthy (${body.via})`);
    await load();
  }

  const newest = useMemo(() => (logs[0] ? formatDateTime(logs[0].createdAt) : null), [logs]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="num text-[13px] text-muted">
          {logs.length} {logs.length === 1 ? "event" : "events"}
          {newest ? `, newest ${newest}` : ""}
          {writeHealth ? `. ${writeHealth}` : ""}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Chip active={platformOpsOnly} onClick={() => setPlatformOpsOnly((value) => !value)}>
            Platform ops only
          </Chip>
          <button
            className="btn-secondary inline-flex items-center gap-2"
            disabled={probing}
            onClick={() => void probeWrite()}
            type="button"
          >
            {probing ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
            Test write
          </button>
          <button
            className="btn-secondary inline-flex items-center gap-2"
            disabled={loading}
            onClick={() => void load()}
            type="button"
          >
            {loading ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <Spinner label={tenantId ? "Loading tenant audit log" : "Loading audit log"} />
      ) : (
        <div className={TABLE_WRAP}>
          {logs.length === 0 ? (
            <EmptyLine>No audit events yet. Use Test write to verify the pipeline.</EmptyLine>
          ) : (
            <div className="max-h-[640px] overflow-auto">
              <table className={TABLE}>
                <thead className="sticky top-0 z-[1] bg-white">
                  <tr className={THEAD_ROW}>
                    <th className={cn(TH, "w-10")} scope="col">
                      <span className="sr-only">Details</span>
                    </th>
                    <th className={TH} scope="col">When</th>
                    <th className={TH} scope="col">Tenant</th>
                    <th className={TH} scope="col">Actor</th>
                    <th className={TH} scope="col">Action</th>
                    <th className={TH} scope="col">Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((entry) => {
                    const open = expandedId === entry.id;
                    const summary = summarizeDetails(entry);
                    return (
                      <Fragment key={entry.id}>
                        <tr className={cn(TR, open && rowHighlight.selected)}>
                          <td className="py-[13px] pl-5">
                            <button
                              aria-expanded={open}
                              aria-label={`${open ? "Hide" : "Show"} details for ${entry.action}`}
                              className="grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-divider hover:text-ink"
                              onClick={() => setExpandedId(open ? null : entry.id)}
                              type="button"
                            >
                              {open ? <ChevronDown aria-hidden className="h-4 w-4" /> : <ChevronRight aria-hidden className="h-4 w-4" />}
                            </button>
                          </td>
                          <td className={TD_META}>{formatDateTime(entry.createdAt)}</td>
                          <td className={TD_MUTED}>
                            {entry.tenantName ?? (entry.tenantId ? entry.tenantId.slice(0, 8) : "—")}
                          </td>
                          <td className={TD_MUTED}>{entry.actorName ?? "—"}</td>
                          <td className={cn(TD, "text-[13px] font-semibold")}>{entry.action}</td>
                          <td className={TD_MUTED}>{summary ?? entry.targetType}</td>
                        </tr>
                        {open ? (
                          <tr className={cn(TR, "bg-bg")}>
                            <td className="px-5 py-3" colSpan={6}>
                              <pre className="overflow-x-auto text-[13px] leading-relaxed text-ink-2">
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
      )}
    </div>
  );
}
