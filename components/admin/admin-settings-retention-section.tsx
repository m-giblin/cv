"use client";

import { Loader2, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
 DEFAULT_ACTIVITY_LOG_RETENTION_DAYS,
 DEFAULT_AI_USAGE_RETENTION_DAYS,
 DEFAULT_AUDIT_LOG_RETENTION_DAYS,
 MAX_RETENTION_DAYS,
 MIN_RETENTION_DAYS,
} from "@/lib/platform/settings-shared";

export function AdminSettingsRetentionSection() {
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [auditLogRetentionDays, setAuditLogRetentionDays] = useState(DEFAULT_AUDIT_LOG_RETENTION_DAYS);
 const [activityLogRetentionDays, setActivityLogRetentionDays] = useState(DEFAULT_ACTIVITY_LOG_RETENTION_DAYS);
 const [aiUsageRetentionDays, setAiUsageRetentionDays] = useState(DEFAULT_AI_USAGE_RETENTION_DAYS);

 const load = useCallback(async () => {
 setLoading(true);
 const response = await fetch("/api/admin/platform-settings");
 setLoading(false);
 if (!response.ok) {
 toast.error("Could not load retention settings.");
 return;
 }
 const body = (await response.json()) as {
 settings: {
 auditLogRetentionDays: number;
 activityLogRetentionDays: number;
 aiUsageRetentionDays: number;
 };
 };
 setAuditLogRetentionDays(body.settings.auditLogRetentionDays);
 setActivityLogRetentionDays(body.settings.activityLogRetentionDays);
 setAiUsageRetentionDays(body.settings.aiUsageRetentionDays);
 }, []);

 useEffect(() => {
 void load();
 }, [load]);

 async function handleSave(event: React.FormEvent) {
 event.preventDefault();
 setSaving(true);
 const response = await fetch("/api/admin/platform-settings", {
 method: "PATCH",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ auditLogRetentionDays, activityLogRetentionDays, aiUsageRetentionDays }),
 });
 setSaving(false);
 if (!response.ok) {
 toast.error("Could not save retention settings.");
 return;
 }
 toast.success("Data retention settings saved.");
 }

 if (loading) {
 return (
 <div className="flex justify-center py-8">
 <Loader2 className="h-6 w-6 animate-spin text-[#0033a1]" />
 </div>
 );
 }

 return (
 <form className="max-w-3xl space-y-4" onSubmit={handleSave}>
 <p className="text-[12px] text-[#6B6860]">
 Target retention for audit logs, activity feed, and AI usage telemetry. Purge jobs use these values.
 </p>
 <div className="border border-[#E2DFD9] bg-white p-[18px_22px] ">
 <div className="space-y-4">
 <label className="block space-y-1 text-sm">
 <span className="font-semibold text-[#3D3C38]">Audit log retention (days)</span>
 <Input max={MAX_RETENTION_DAYS} min={MIN_RETENTION_DAYS} onChange={(e) => setAuditLogRetentionDays(Number(e.target.value))} type="number" value={auditLogRetentionDays} />
 </label>
 <label className="block space-y-1 text-sm">
 <span className="font-semibold text-[#3D3C38]">Activity feed retention (days)</span>
 <Input max={MAX_RETENTION_DAYS} min={MIN_RETENTION_DAYS} onChange={(e) => setActivityLogRetentionDays(Number(e.target.value))} type="number" value={activityLogRetentionDays} />
 </label>
 <label className="block space-y-1 text-sm">
 <span className="font-semibold text-[#3D3C38]">AI usage log retention (days)</span>
 <Input max={MAX_RETENTION_DAYS} min={MIN_RETENTION_DAYS} onChange={(e) => setAiUsageRetentionDays(Number(e.target.value))} type="number" value={aiUsageRetentionDays} />
 </label>
 </div>
 </div>
 <Button disabled={saving} type="submit">
 {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
 Save retention settings
 </Button>
 </form>
 );
}
