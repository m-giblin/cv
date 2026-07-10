"use client";

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
 <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
 <p className="text-sm text-slate-600">{error}</p>
 </div>
 );
 }

 if (!room) {
 return (
 <div className="flex min-h-screen items-center justify-center bg-slate-50">
 <p className="text-sm text-slate-500">Loading…</p>
 </div>
 );
 }

 const { payload } = room;

 return (
 <div className="min-h-screen bg-gradient-to-b from-[#00143a] to-[#0033a1] px-4 py-10 text-white">
 <div className="mx-auto max-w-2xl">
 <p className="text-xs font-semibold uppercase tracking-widest text-blue-200">SailPoint · Shared with you</p>
 <h1 className="mt-2 font-display text-3xl font-bold">{room.title}</h1>
 <p className="mt-1 text-blue-100">{room.accountName}</p>
 {payload.seName ? <p className="mt-1 text-sm text-blue-200">Prepared by {payload.seName}</p> : null}

 <div className="mt-8 space-y-6 bg-white p-6 text-slate-800 ">
 <section>
 <h2 className="text-sm font-bold uppercase tracking-wide text-[#0033a1]">Executive summary</h2>
 <p className="mt-2 text-sm leading-7">{payload.executiveSummary}</p>
 </section>

 {payload.personalizationBullets.length > 0 ? (
 <section>
 <h2 className="text-sm font-bold uppercase tracking-wide text-[#0033a1]">For your organization</h2>
 <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
 {payload.personalizationBullets.map((bullet) => (
 <li key={bullet}>{bullet}</li>
 ))}
 </ul>
 </section>
 ) : null}

 {payload.resources.length > 0 ? (
 <section>
 <h2 className="text-sm font-bold uppercase tracking-wide text-[#0033a1]">Resources</h2>
 <ul className="mt-3 space-y-2">
 {payload.resources.map((resource, index) => (
 <li key={`${resource.label}-${index}`}>
 {resource.body ? (
 <div className="border border-slate-200 bg-slate-50 p-3 text-sm">
 <p className="font-semibold text-slate-900">{resource.label}</p>
 <p className="mt-1 text-slate-600">{resource.body}</p>
 </div>
 ) : (
 <button
 className="w-full border border-[#0033a1]/20 bg-[#e8f2fc] px-4 py-3 text-left text-sm font-semibold text-[#0033a1] hover:bg-[#dbeafe]"
 onClick={() => trackResource(resource.label, resource.url)}
 type="button"
 >
 {resource.label} →
 </button>
 )}
 </li>
 ))}
 </ul>
 </section>
 ) : null}
 </div>

 <p className="mt-6 text-center text-xs text-blue-200">
 Confidential — prepared for {room.accountName}. Do not forward without permission.
 </p>
 </div>
 </div>
 );
}
