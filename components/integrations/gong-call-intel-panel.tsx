"use client";

import { Loader2, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type GongIntel = {
 accountName: string;
 callCount: number;
 avgTalkRatio: number | null;
 objectionThemes: string[];
 summary: string;
 talkTrackHints: string[];
 riskSignals: string[];
 source: "gong" | "template";
};

export function GongCallIntelPanel({ accountName }: { accountName: string }) {
 const [intel, setIntel] = useState<GongIntel | null>(null);
 const [loading, setLoading] = useState(false);

 async function refresh() {
 if (!accountName.trim()) return;
 setLoading(true);
 const response = await fetch("/api/integrations/gong/intel", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ accountName }),
 });
 setLoading(false);
 if (!response.ok) return;
 const body = (await response.json()) as { intel: GongIntel };
 setIntel(body.intel);
 }

 useEffect(() => {
 if (accountName.trim().length >= 2) {
 void fetch(`/api/integrations/gong/intel?accountName=${encodeURIComponent(accountName)}`)
 .then((response) => (response.ok ? response.json() : null))
 .then((body) => {
 if (body?.intel) setIntel(body.intel as GongIntel);
 });
 }
 }, [accountName]);

 return (
 <Card className="border-sp-blue/15">
 <CardHeader className="pb-3">
 <div className="flex flex-wrap items-center justify-between gap-2">
 <div>
 <CardTitle className="flex items-center gap-2 text-base">
 <Phone className="h-4 w-4 text-sp-blue" />
 Gong call intelligence
 </CardTitle>
 <CardDescription>Talk ratio, objection themes, and pre-call brief from live Gong data.</CardDescription>
 </div>
 <div className="flex items-center gap-2">
 {intel ? (
 <Badge tone={intel.source === "gong" ? "green" : "amber"}>
 {intel.source === "gong" ? "Live Gong" : "Template"}
 </Badge>
 ) : null}
 <Button disabled={loading || !accountName} onClick={() => void refresh()} size="sm" type="button" variant="outline">
 {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sync"}
 </Button>
 </div>
 </div>
 </CardHeader>
 {intel ? (
 <div className="space-y-3 px-6 pb-6 text-sm">
 <p className="text-sp-navy-muted">{intel.summary}</p>
 <div className="flex flex-wrap gap-2">
 <Badge tone="blue">{intel.callCount} calls</Badge>
 {intel.avgTalkRatio !== null ? (
 <Badge tone={intel.avgTalkRatio > 55 ? "amber" : "green"}>SE talk {intel.avgTalkRatio}%</Badge>
 ) : null}
 </div>
 {intel.objectionThemes.length > 0 ? (
 <div>
 <p className="text-xs font-semibold uppercase text-sp-navy">Objection themes</p>
 <div className="mt-1 flex flex-wrap gap-1">
 {intel.objectionThemes.map((theme) => (
 <Badge key={theme} tone="magenta">
 {theme}
 </Badge>
 ))}
 </div>
 </div>
 ) : null}
 <ul className="list-disc space-y-1 pl-5 text-xs text-sp-navy-muted">
 {intel.talkTrackHints.map((hint) => (
 <li key={hint}>{hint}</li>
 ))}
 </ul>
 </div>
 ) : (
 <p className="px-6 pb-6 text-xs text-sp-navy-muted">Enter an account name and sync to pull Gong intel.</p>
 )}
 </Card>
 );
}
