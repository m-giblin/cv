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
 return (
 <div className="flex justify-center py-8">
 <Loader2 className="h-6 w-6 animate-spin text-[#0033a1]" />
 </div>
 );
 }

 return (
 <form className="max-w-3xl space-y-4" onSubmit={handleSave}>
 <p className="text-[12px] text-[#6B6860]">Platform-wide behavior for every signed-in user.</p>
 <div className="border border-[#E2DFD9] bg-white p-[18px_22px] ">
 <label className="block space-y-2 text-sm">
 <span className="font-semibold text-[#3D3C38]">Session idle timeout (minutes)</span>
 <p className="text-[10.5px] leading-relaxed text-[#A09D98]">
 Sign out after inactivity. Default 15 minutes; increase for UAT (max {MAX_SESSION_IDLE_MINUTES}).
 </p>
 <Input
 max={MAX_SESSION_IDLE_MINUTES}
 min={MIN_SESSION_IDLE_MINUTES}
 onChange={(event) => setSessionIdleMinutes(Number(event.target.value))}
 type="number"
 value={sessionIdleMinutes}
 />
 </label>
 </div>
 <Button disabled={saving} type="submit">
 {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
 Save basic settings
 </Button>
 </form>
 );
}
