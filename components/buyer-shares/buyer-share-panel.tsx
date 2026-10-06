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

 async function createRoom() {
 setCreating(true);
 const response = await fetch("/api/buyer-shares", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 prepSessionId: sessionId ?? undefined,
 accountName,
 title: `${accountName} briefing`,
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
 toast.success("Buyer room created. Copy the link for your prospect.");
 }

 async function copyLink() {
 if (!shareUrl) return;
 await navigator.clipboard.writeText(shareUrl);
 toast.success("Link copied.");
 }

 return (
 <div className="rounded-[14px] border border-line bg-white p-4">
 <div className="flex flex-wrap items-start justify-between gap-3">
 <div>
 <p className="flex items-center gap-2 text-sm font-bold text-ink">
 <Link2 aria-hidden className="h-4 w-4 text-blue" />
 Buyer room
 </p>
 <p className="mt-1 max-w-[520px] text-[13px] text-muted">
 Share a tracked link with your buyer and see when they open resources.
 </p>
 </div>
 {!shareUrl ? (
 <Button disabled={creating} onClick={() => void createRoom()} size="sm" type="button">
 {creating ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
 {creating ? "Creating…" : "Create share link"}
 </Button>
 ) : (
 <Button onClick={() => void copyLink()} size="sm" type="button" variant="outline">
 <Copy aria-hidden className="h-4 w-4" />
 Copy link
 </Button>
 )}
 </div>
 {shareUrl ? (
 <p className="mt-3 break-all rounded-[10px] border border-line bg-bg px-3 py-2 text-[13px] text-ink-2">{shareUrl}</p>
 ) : null}
 </div>
 );
}
