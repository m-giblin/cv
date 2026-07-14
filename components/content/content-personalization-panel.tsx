"use client";

import { useEffect, useState } from "react";
import type { DealPrepOutput } from "@/lib/ai/schemas";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export function ContentPersonalizationPanel({
 accountName,
 buyerPersona,
 bullets,
}: {
 accountName?: string;
 buyerPersona?: string;
 bullets?: string[];
}) {
 const [personalization, setPersonalization] = useState({
 account: accountName ?? "Your account",
 persona: buyerPersona ?? "Primary buyer persona",
 bullets: bullets ?? [],
 });

 useEffect(() => {
 if (accountName || buyerPersona || bullets?.length) {
 setPersonalization({
 account: accountName ?? "Your account",
 persona: buyerPersona ?? "Primary buyer persona",
 bullets: bullets ?? [],
 });
 return;
 }

 void (async () => {
 const response = await fetch("/api/deal-prep/sessions");
 if (!response.ok) return;
 const body = (await response.json()) as {
 sessions: { account_name: string; prep_output: DealPrepOutput | null }[];
 };
 const latest = body.sessions?.[0];
 if (!latest?.prep_output) return;
 setPersonalization({
 account: latest.account_name,
 persona: latest.prep_output.buyerPersona ?? "Executive stakeholder",
 bullets:
 latest.prep_output.personalizationBullets ??
 latest.prep_output.proofPoints?.slice(0, 3) ??
 [],
 });
 })();
 }, [accountName, buyerPersona, bullets]);

 return (
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-base">
 <FileText className="h-4 w-4 text-sp-magenta" />
 LiveDoc-style personalization
 </CardTitle>
 <CardDescription>
 Account-specific proof points from your latest deal prep — swap persona and bullets before customer meetings.
 </CardDescription>
 </CardHeader>
 <div className="border border-sp-magenta/15 bg-sp-magenta-soft/10 p-4 text-sm">
 <p className="font-semibold text-sp-navy">{personalization.account}</p>
 <p className="text-xs text-sp-navy-muted">{personalization.persona}</p>
 <ul className="mt-3 list-disc space-y-1 pl-4 text-sp-navy-muted">
 {personalization.bullets.length > 0 ? (
 personalization.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)
 ) : (
 <li>Generate a deal prep brief to populate personalized collateral.</li>
 )}
 </ul>
 </div>
 </Card>
 );
}
