"use client";

import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { BuyerRoomPayload } from "@/lib/buyer-shares/room";

export function BuyerShareRoom({ token }: { token: string }) {
 const [room, setRoom] = useState<{ title: string; accountName: string; payload: BuyerRoomPayload } | null>(null);
 const [error, setError] = useState<string | null>(null);
 const startRef = useRef(Date.now());
 const fingerprintRef = useRef(typeof crypto !== "undefined" ? crypto.randomUUID() : "anon");

 useEffect(() => {
 void fetch(`/api/share/${token}`)
 .then(async (response) => {
 if (!response.ok) {
 setError(response.status === 410 ? "This room has expired." : "Room not found.");
 return;
 }
 const body = (await response.json()) as {
 title: string;
 accountName: string;
 payload: BuyerRoomPayload;
 };
 setRoom(body);
 void fetch(`/api/share/${token}/track`, {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 eventType: "room_view",
 viewerFingerprint: fingerprintRef.current,
 }),
 });
 })
 .catch(() => setError("Could not load this room."));
 }, [token]);

 useEffect(() => {
 return () => {
 const seconds = Math.round((Date.now() - startRef.current) / 1000);
 if (seconds > 3) {
 void fetch(`/api/share/${token}/track`, {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 eventType: "time_on_page",
 viewerFingerprint: fingerprintRef.current,
 durationSeconds: seconds,
 }),
 });
 }
 };
 }, [token]);

 function trackResource(label: string, url?: string) {
 void fetch(`/api/share/${token}/track`, {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 eventType: "resource_open",
 resourceLabel: label,
 viewerFingerprint: fingerprintRef.current,
 }),
 });
 if (url?.startsWith("http")) {
 window.open(url, "_blank", "noopener,noreferrer");
 }
 }

 if (error) {
 return (
 <main className="flex min-h-screen items-center justify-center bg-bg px-6" id="main-content">
 <div className="max-w-md rounded-[14px] border border-line bg-white p-6 text-center">
 <p className="label-caps label-caps--blue">Shared room</p>
 <h1 className="mt-1 text-2xl font-extrabold text-ink">{error}</h1>
 <p className="mt-2 text-[15px] text-ink-2">Ask the person who sent you this link for a fresh one.</p>
 </div>
 </main>
 );
 }

 if (!room) {
 return (
 <main className="flex min-h-screen items-center justify-center bg-bg" id="main-content">
 <p className="text-sm text-muted" role="status">
 Loading…
 </p>
 </main>
 );
 }

 const { payload } = room;

 return (
 <div className="min-h-screen bg-bg">
 <header className="bg-blue px-4 pt-10 pb-24 text-white sm:px-10">
 <div className="mx-auto max-w-2xl">
 <p className="label-caps text-signal">Shared with you</p>
 <h1 className="page-title mt-3 max-sm:text-[32px]">{room.title}</h1>
 <p className="mt-3 text-lg text-on-blue">{room.accountName}</p>
 {payload.seName ? (
 <p className="mt-1 text-sm text-on-blue">Prepared by {payload.seName}</p>
 ) : null}
 </div>
 </header>

 <main className="mx-auto -mt-16 max-w-2xl px-4 pb-12 sm:px-0" id="main-content">
 <div className="space-y-7 rounded-[14px] border border-line bg-white p-6 sm:p-8">
 <section>
 <h2 className="label-caps label-caps--blue">Executive summary</h2>
 <p className="mt-2 text-[15px] leading-normal text-ink">{payload.executiveSummary}</p>
 </section>

 {payload.personalizationBullets.length > 0 ? (
 <section>
 <h2 className="label-caps label-caps--blue">For your organization</h2>
 <ul className="mt-2 space-y-1.5 text-[15px] leading-normal text-ink">
 {payload.personalizationBullets.map((bullet) => (
 <li className="flex gap-3" key={bullet}>
 <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-blue" />
 {bullet}
 </li>
 ))}
 </ul>
 </section>
 ) : null}

 {payload.resources.length > 0 ? (
 <section>
 <h2 className="label-caps label-caps--blue">Resources</h2>
 <ul className="mt-3 overflow-hidden rounded-[14px] border border-line">
 {payload.resources.map((resource, index) => (
 <li className="border-b border-divider last:border-b-0" key={`${resource.label}-${index}`}>
 {resource.body ? (
 <div className="px-4 py-3">
 <p className="text-[15px] font-semibold text-ink">{resource.label}</p>
 <p className="mt-1 text-sm text-ink-2">{resource.body}</p>
 </div>
 ) : (
 <button
 className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-[15px] font-bold text-blue hover:bg-blue-soft hover:underline"
 onClick={() => trackResource(resource.label, resource.url)}
 type="button"
 >
 {resource.label}
 <ArrowUpRight aria-hidden className="h-4 w-4 shrink-0" />
 </button>
 )}
 </li>
 ))}
 </ul>
 </section>
 ) : null}
 </div>

 <p className="mt-6 text-center text-[13px] text-muted">
 Confidential. Prepared for {room.accountName}. Please don&apos;t forward without permission.
 </p>
 </main>
 </div>
 );
}
