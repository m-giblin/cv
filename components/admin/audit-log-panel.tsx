"use client";

import { Download, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AuditEntry = {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

export function AuditLogPanel() {
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
    <Card>
      <CardHeader>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <CardTitle>Audit log</CardTitle>
            <CardDescription>Immutable record of admin and plan management actions.</CardDescription>
          </div>
          <Button asChild size="sm" variant="outline">
            <a href="/api/admin/audit-log?format=csv">
              <Download className="h-4 w-4" />
              Export CSV
            </a>
          </Button>
        </div>
      </CardHeader>
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-sp-blue" />
        </div>
      ) : (
        <div className="max-h-[480px] space-y-2 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-sm text-sp-navy-muted">No audit entries yet. Run the Sprint 5 migration first.</p>
          ) : (
            logs.map((log) => (
              <div className="rounded-xl border border-sp-blue/10 p-3 text-sm" key={log.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-sp-navy">{log.action}</span>
                  <span className="text-xs text-sp-navy-muted">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-xs text-sp-navy-muted">
                  {log.target_type}
                  {log.target_id ? ` • ${log.target_id.slice(0, 8)}…` : ""}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </Card>
  );
}
