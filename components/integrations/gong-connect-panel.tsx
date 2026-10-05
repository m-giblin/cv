"use client";

import { Loader2, Plug } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function GongConnectPanel() {
 const [gongConnected, setGongConnected] = useState(false);
 const [loading, setLoading] = useState(true);
 const [connecting, setConnecting] = useState(false);

 useEffect(() => {
 void fetch("/api/integrations/status")
 .then((response) => (response.ok ? response.json() : { signals: [] }))
 .then((body: { signals: Array<{ provider: string; status: string }> }) => {
 const gong = body.signals.find((signal) => signal.provider === "gong");
 setGongConnected(gong?.status === "connected");
 setLoading(false);
 })
 .catch(() => setLoading(false));
 }, []);

 async function connectGong() {
 setConnecting(true);
 const response = await fetch("/api/integrations/gong/oauth/start");
 if (!response.ok) {
 const body = (await response.json()) as { hint?: string };
 toast.message("Gong workspace key or OAuth required", {
 description: body.hint ?? "Ask your admin to set GONG_API_KEY or complete Gong OAuth app registration.",
 });
 setConnecting(false);
 return;
 }

 const body = (await response.json()) as { authorizeUrl: string };
 window.location.href = body.authorizeUrl;
 }

 if (loading) {
 return (
 <div className="flex items-center gap-2 text-xs text-muted">
 <Loader2 className="h-3.5 w-3.5 animate-spin" />
 Checking Gong…
 </div>
 );
 }

 return (
 <div className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-line bg-blue-soft px-3 py-2">
 <div className="flex items-center gap-2 text-sm">
 <Plug className="h-4 w-4 text-blue" />
 <span className="font-semibold text-ink">Gong pre-call intel</span>
 <Badge tone={gongConnected ? "green" : "amber"}>{gongConnected ? "✓ Connected" : "▲ Not connected"}</Badge>
 </div>
 {!gongConnected ? (
 <Button disabled={connecting} onClick={() => void connectGong()} size="sm" type="button" variant="outline">
 {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect Gong"}
 </Button>
 ) : (
 <p className="text-xs text-ink-2">Briefs merge into prep when you generate.</p>
 )}
 </div>
 );
}
