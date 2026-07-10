"use client";

import { Plug, Radio } from "lucide-react";
import { useEffect, useState } from "react";
import { integrationStatusLabel } from "@/lib/integrations/activity-signals";
import type { IntegrationSignal } from "@/lib/integrations/activity-signals";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function IntegrationSignalsPanel() {
 const [signals, setSignals] = useState<IntegrationSignal[]>([]);

 useEffect(() => {
 void fetch("/api/integrations/status")
 .then((response) => (response.ok ? response.json() : { signals: [] }))
 .then((body: { signals: IntegrationSignal[] }) => setSignals(body.signals ?? []))
 .catch(() => setSignals([]));
 }, []);

 return (
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-base">
 <Radio className="h-4 w-4 text-sp-blue" />
 Activity signals
 </CardTitle>
 <CardDescription>
 Gong call intel and Slack digests — set GONG_API_KEY / SLACK_BOT_TOKEN to connect.
 </CardDescription>
 </CardHeader>
 <div className="space-y-3">
 {signals.map((signal) => (
 <div
 className="flex items-start justify-between gap-3 border border-sp-blue/10 bg-sp-blue-soft/10 px-3 py-2"
 key={signal.id}
 >
 <div className="min-w-0">
 <div className="flex items-center gap-2">
 <Plug className="h-3.5 w-3.5 shrink-0 text-sp-navy-muted" />
 <p className="text-sm font-semibold text-sp-navy">{signal.label}</p>
 </div>
 <p className="mt-1 text-xs leading-5 text-sp-navy-muted">{signal.description}</p>
 {signal.lastSync ? (
 <p className="mt-1 text-[10px] text-sp-navy-muted">
 Last sync {new Date(signal.lastSync).toLocaleString()}
 </p>
 ) : null}
 </div>
 <Badge tone={signal.status === "connected" ? "green" : "slate"}>
 {integrationStatusLabel(signal.status)}
 </Badge>
 </div>
 ))}
 </div>
 </Card>
 );
}
