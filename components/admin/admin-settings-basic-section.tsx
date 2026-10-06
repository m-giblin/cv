"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { Field, LineCard, LoadingState, TextInput } from "@/components/admin/admin-ui";
import {
  DEFAULT_SESSION_IDLE_MINUTES,
  MAX_SESSION_IDLE_MINUTES,
  MIN_SESSION_IDLE_MINUTES,
} from "@/lib/platform/settings-shared";

export function AdminSettingsBasicSection() {
  const id = useId();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sessionIdleMinutes, setSessionIdleMinutes] = useState(DEFAULT_SESSION_IDLE_MINUTES);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/admin/platform-settings");
    setLoading(false);
    if (!response.ok) {
      toast.error("Could not load platform settings.");
      return;
    }
    const body = (await response.json()) as { settings: { sessionIdleMinutes: number } };
    setSessionIdleMinutes(body.settings.sessionIdleMinutes);
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
      body: JSON.stringify({ sessionIdleMinutes }),
    });
    setSaving(false);
    if (!response.ok) {
      toast.error("Could not save basic settings.");
      return;
    }
    toast.success("Session timeout updated.");
  }

  if (loading) {
    return <LoadingState label="Loading platform settings…" />;
  }

  return (
    <form className="flex max-w-3xl flex-col gap-6" onSubmit={handleSave}>
      <LineCard meta="Applies to every signed-in user" title="Sessions">
        <Field
          hint={`Users are signed out after this much inactivity. The default is ${DEFAULT_SESSION_IDLE_MINUTES} minutes; raise it for UAT. Allowed range is ${MIN_SESSION_IDLE_MINUTES} to ${MAX_SESSION_IDLE_MINUTES}.`}
          htmlFor={`${id}-idle`}
          label="Session idle timeout (minutes)"
        >
          <TextInput
            className="max-w-40"
            id={`${id}-idle`}
            max={MAX_SESSION_IDLE_MINUTES}
            min={MIN_SESSION_IDLE_MINUTES}
            onChange={(event) => setSessionIdleMinutes(Number(event.target.value))}
            type="number"
            value={sessionIdleMinutes}
          />
        </Field>
      </LineCard>
      <div>
        <button className="btn-primary" disabled={saving} type="submit">
          {saving ? "Saving…" : "Save general settings"}
        </button>
      </div>
    </form>
  );
}
