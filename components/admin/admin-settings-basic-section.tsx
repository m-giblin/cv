"use client";

import { Loader2, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_SESSION_IDLE_MINUTES,
  MAX_SESSION_IDLE_MINUTES,
  MIN_SESSION_IDLE_MINUTES,
} from "@/lib/platform/settings-shared";

export function AdminSettingsBasicSection() {
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

    if (sessionIdleMinutes < MIN_SESSION_IDLE_MINUTES || sessionIdleMinutes > MAX_SESSION_IDLE_MINUTES) {
      toast.error(`Session timeout must be between ${MIN_SESSION_IDLE_MINUTES} and ${MAX_SESSION_IDLE_MINUTES} minutes.`);
      return;
    }

    setSaving(true);
    const response = await fetch("/api/admin/platform-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionIdleMinutes }),
    });
    setSaving(false);

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      toast.error(body.error ?? "Could not save platform settings.");
      return;
    }

    toast.success("Basic settings saved. New sessions use the updated idle timeout.");
    void load();
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
      <div>
        <p className="text-base font-bold text-[#0a1628]">Basic</p>
        <p className="text-xs text-[#64748b]">Platform-wide behavior that applies to every signed-in user.</p>
      </div>

      <div className="rounded-xl border border-[#e2eaf5] bg-white p-[18px_22px]">
        <label className="block space-y-2 text-sm">
          <span className="font-semibold text-[#1e293b]">Session idle timeout (minutes)</span>
          <p className="text-[11px] leading-relaxed text-[#94a3b8]">
            Users are signed out after this many minutes without mouse, keyboard, scroll, or touch activity. Default is 15
            minutes. Increase during UAT (up to {MAX_SESSION_IDLE_MINUTES} minutes / 24 hours).
          </p>
          <Input
            max={MAX_SESSION_IDLE_MINUTES}
            min={MIN_SESSION_IDLE_MINUTES}
            onChange={(event) => setSessionIdleMinutes(Number(event.target.value))}
            step={1}
            type="number"
            value={sessionIdleMinutes}
          />
          <p className="text-[10px] text-[#94a3b8]">
            Allowed range: {MIN_SESSION_IDLE_MINUTES}–{MAX_SESSION_IDLE_MINUTES} minutes. Active users pick up the new
            value on their next page load.
          </p>
        </label>
      </div>

      <Button disabled={saving} type="submit">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save basic settings
      </Button>
    </form>
  );
}
