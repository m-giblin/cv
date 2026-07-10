"use client";

import { useEffect, useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Interaction = {
 id: string;
 personName: string;
 mode: string;
 query: string;
 accountName: string | null;
 replyPreview: string | null;
 sourceCount: number;
 model: string | null;
 createdAt: string;
 recommendedCert: string | null;
};

export function IscLabActivityPanel() {
 const [interactions, setInteractions] = useState<Interaction[]>([]);
 const [summary, setSummary] = useState({ total: 0, last7Days: 0, topUsers: [] as Array<{ name: string; count: number }> });

 useEffect(() => {
 void fetch("/api/manager/isc-lab-stats")
 .then((response) => (response.ok ? response.json() : { interactions: [], summary: { total: 0, last7Days: 0, topUsers: [] } }))
 .then((body: { interactions: Interaction[]; summary: typeof summary }) => {
 setInteractions(body.interactions ?? []);
 setSummary(body.summary ?? { total: 0, last7Days: 0, topUsers: [] });
 })
 .catch(() => undefined);
 }, []);

 return (
 <Card>
 <CardHeader>
 <CardTitle className="text-base">ISC Lab activity</CardTitle>
 <CardDescription>
 SE trust signal — who is researching with cited sources before customer calls. {summary.last7Days} sessions
 in the last 7 days ({summary.total} in 30 days).
 </CardDescription>
 </CardHeader>
 <div className="space-y-3 px-6 pb-6">
 {summary.topUsers.length > 0 ? (
 <div className="flex flex-wrap gap-2">
 {summary.topUsers.map((user) => (
 <Badge key={user.name} tone="blue">
 {user.name}: {user.count}
 </Badge>
 ))}
 </div>
 ) : null}
 {interactions.length === 0 ? (
 <p className="text-sm text-stone-500">No ISC Lab usage from your team yet this month.</p>
 ) : (
 interactions.slice(0, 8).map((item) => (
 <div className="border border-stone-200 p-3 text-sm" key={item.id}>
 <div className="flex flex-wrap items-center justify-between gap-2">
 <p className="font-semibold text-stone-900">{item.personName}</p>
 <Badge tone="slate">{item.mode}</Badge>
 </div>
 <p className="mt-1 line-clamp-2 text-stone-600">{item.query}</p>
 <p className="mt-1 text-xs text-stone-400">
 {item.sourceCount} sources · {item.model ?? "AI"} · {new Date(item.createdAt).toLocaleString()}
 {item.accountName ? ` · ${item.accountName}` : ""}
 </p>
 </div>
 ))
 )}
 </div>
 </Card>
 );
}
