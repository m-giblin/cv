"use client";

import { Copy, Link2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { DealPrepOutput } from "@/lib/ai/schemas";

export function BuyerSharePanel({
 prep,
 sessionId,
 accountName,
}: {
 prep: DealPrepOutput;
 sessionId: string | null;
 accountName: string;
}) {
 const [shareUrl, setShareUrl] = useState<string | null>(null);
 const [creating, setCreating] = useState(false);
 const [views, setViews] = useState<number | null>(null);

 async function createRoom() {
 setCreating(true);
 const response = await fetch("/api/buyer-shares", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 prepSessionId: sessionId ?? undefined,
 accountName,
 title: `${accountName} — SailPoint briefing`,
 prepOutput: prep,
 }),
 });
 setCreating(false);

 if (!response.ok) {
 toast.error("Could not create buyer room.");
 return;
 }

 const body = (await response.json()) as { shareUrl: string };
 setShareUrl(body.shareUrl);
 toast.success("Buyer room created — copy the link for your prospect.");
 }

 async function copyLink() {
 if (!shareUrl) return;
 await navigator.clipboard.writeText(shareUrl);
 toast.success("Link copied.");
 }

 return (
 <div className="border border-emerald-200/80 bg-emerald-50/50 p-4">
 <div className="flex flex-wrap items-start justify-between gap-3">
 <div>
 <p className="flex items-center gap-2 text-sm font-bold text-sp-navy">
 <Link2 className="h-4 w-4 text-emerald-700" />
 Buyer room (DSR-lite)
 </p>
 <p className="mt-1 text-xs text-sp-navy-muted">
 Share a tracked link with your buyer — see when they open resources. Beats Seismic LiveDocs for ramp SEs.
 </p>
 </div>
 {!shareUrl ? (
 <Button disabled={creating} onClick={() => void createRoom()} size="sm" type="button">
 {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create share link"}
 </Button>
 ) : (
 <Button onClick={() => void copyLink()} size="sm" type="button" variant="outline">
 <Copy className="h-4 w-4" />
 Copy link
 </Button>
 )}
 </div>
 {shareUrl ? (
 <p className="mt-3 break-all bg-white px-3 py-2 text-xs text-sp-navy-muted">{shareUrl}</p>
 ) : null}
 {views !== null ? <p className="mt-2 text-xs text-emerald-800">{views} buyer views</p> : null}
 </div>
 );
}
