"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { Field, LineCard, LoadingState, TextInput } from "@/components/admin/admin-ui";
import {
  DEFAULT_ACTIVITY_LOG_RETENTION_DAYS,
  DEFAULT_AI_USAGE_RETENTION_DAYS,
  DEFAULT_AUDIT_LOG_RETENTION_DAYS,
  MAX_RETENTION_DAYS,
  MIN_RETENTION_DAYS,
} from "@/lib/platform/settings-shared";

export function AdminSettingsRetentionSection() {
  const id = useId();
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
    return <LoadingState label="Loading retention settings…" />;
  }

  const fields = [
    {
      key: "audit",
      label: "Audit log retention (days)",
      value: auditLogRetentionDays,
      set: setAuditLogRetentionDays,
      fallback: DEFAULT_AUDIT_LOG_RETENTION_DAYS,
    },
    {
      key: "activity",
      label: "Activity feed retention (days)",
      value: activityLogRetentionDays,
      set: setActivityLogRetentionDays,
      fallback: DEFAULT_ACTIVITY_LOG_RETENTION_DAYS,
    },
    {
      key: "ai",
      label: "AI usage log retention (days)",
      value: aiUsageRetentionDays,
      set: setAiUsageRetentionDays,
      fallback: DEFAULT_AI_USAGE_RETENTION_DAYS,
    },
  ];

  return (
    <form className="flex max-w-3xl flex-col gap-6" onSubmit={handleSave}>
      <LineCard meta={`${MIN_RETENTION_DAYS} to ${MAX_RETENTION_DAYS} days`} title="Retention windows">
        <div className="flex flex-col gap-5">
          <p className="text-sm text-muted">
            How long to keep audit logs, the activity feed and AI usage telemetry. Purge jobs use these values.
          </p>
          {fields.map((field) => (
            <Field
              hint={`The default is ${field.fallback} days.`}
              htmlFor={`${id}-${field.key}`}
              key={field.key}
              label={field.label}
            >
              <TextInput
                className="max-w-40"
                id={`${id}-${field.key}`}
                max={MAX_RETENTION_DAYS}
                min={MIN_RETENTION_DAYS}
                onChange={(event) => field.set(Number(event.target.value))}
                type="number"
                value={field.value}
              />
            </Field>
          ))}
        </div>
      </LineCard>
      <div>
        <button className="btn-primary" disabled={saving} type="submit">
          {saving ? "Saving…" : "Save retention settings"}
        </button>
      </div>
    </form>
  );
}
