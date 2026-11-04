"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SESSION_IDLE_MS } from "@/lib/auth/rbac";
import { AUTH_ROUTES, SESSION_ACTIVITY_PATH } from "@/lib/auth/routes";
import { DEFAULT_SESSION_IDLE_MINUTES } from "@/lib/platform/settings-shared";
import { createClient } from "@/lib/supabase/client";

const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart", "mousemove"] as const;
/** Tell the server about on-page activity at most this often, so its idle cookie stays fresh. */
const HEARTBEAT_INTERVAL_MS = 60_000;
/** How long before sign-out the "Are you still there?" warning appears. */
const WARNING_BEFORE_MS = 2 * 60_000;
const WARNING_TOAST_ID = "session-idle-warning";
const SHARED_ACTIVITY_KEY = "sp_last_activity_at";

function formatIdleLabel(minutes: number) {
 if (minutes >= 60) {
 const hours = Math.floor(minutes / 60);
 const remainder = minutes % 60;
 return remainder > 0 ? `${hours}h ${remainder}m` : `${hours} hour${hours === 1 ? "" : "s"}`;
 }
 return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

export function SessionTimeout() {
 const router = useRouter();
 const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 const idleMsRef = useRef(SESSION_IDLE_MS);
 const idleMinutesRef = useRef(DEFAULT_SESSION_IDLE_MINUTES);
 const [idleMs, setIdleMs] = useState(SESSION_IDLE_MS);

 useEffect(() => {
 void fetch("/api/platform/session-idle")
 .then((response) => (response.ok ? response.json() : null))
 .then((body: { idleMs?: number; idleMinutes?: number } | null) => {
 if (!body?.idleMs) return;
 idleMsRef.current = body.idleMs;
 idleMinutesRef.current = body.idleMinutes ?? Math.round(body.idleMs / 60_000);
 setIdleMs(body.idleMs);
 })
 .catch(() => {
 /* keep default */
 });
 }, []);

 useEffect(() => {
 idleMsRef.current = idleMs;
 }, [idleMs]);

 useEffect(() => {
 const supabase = createClient();

 if (!supabase) {
 return;
 }

 const client = supabase;

 /** Activity in any open tab counts, so an idle background tab never signs out a busy one. */
 function sharedLastActivity(): number {
 try {
 return Number(window.localStorage.getItem(SHARED_ACTIVITY_KEY)) || 0;
 } catch {
 return 0;
 }
 }

 function recordSharedActivity(now: number) {
 try {
 window.localStorage.setItem(SHARED_ACTIVITY_KEY, String(now));
 } catch {
 /* storage blocked: this tab's own timer still works */
 }
 }

 async function expireSession() {
 const idleFor = Date.now() - Math.max(lastActivity, sharedLastActivity());
 if (idleFor < idleMsRef.current) {
 // Someone was active in another tab: wait out the rest instead of signing out.
 schedule(idleMsRef.current - idleFor);
 return;
 }

 const {
 data: { user },
 } = await client.auth.getUser();

 if (!user) {
 return;
 }

 toast.dismiss(WARNING_TOAST_ID);
 await client.auth.signOut();
 toast.message("Session expired", {
 description: `You were signed out after ${formatIdleLabel(idleMinutesRef.current)} of inactivity.`,
 });
 router.push(`${AUTH_ROUTES.login}?error=session_expired`);
 router.refresh();
 }

 function showWarning() {
 const idleFor = Date.now() - Math.max(lastActivity, sharedLastActivity());
 const remainingMs = idleMsRef.current - idleFor;
 if (remainingMs > WARNING_BEFORE_MS + 1_000) {
 // Another tab was active: push the warning back.
 schedule(remainingMs);
 return;
 }
 const minutes = Math.max(1, Math.round(remainingMs / 60_000));
 toast.warning("Are you still there?", {
 id: WARNING_TOAST_ID,
 description: `You'll be signed out in about ${minutes} minute${minutes === 1 ? "" : "s"} because nothing has happened on the page. Anything you haven't saved stays on this page, but you'll need to sign in again to save it.`,
 duration: Infinity,
 action: {
 label: "Stay signed in",
 onClick: () => {
 lastHeartbeat = 0;
 resetTimer();
 },
 },
 });
 }

 let lastHeartbeat = Date.now();
 let lastActivity = Date.now();
 let warningShown = false;

 function sendHeartbeat(now: number) {
 if (now - lastHeartbeat < HEARTBEAT_INTERVAL_MS) return;
 lastHeartbeat = now;
 recordSharedActivity(now);
 void fetch(SESSION_ACTIVITY_PATH, { method: "POST" }).catch(() => {
 /* offline: the next page load or heartbeat will catch up */
 });
 }

 /** Time out after `remainingMs`, warning WARNING_BEFORE_MS ahead. */
 function schedule(remainingMs: number) {
 if (timerRef.current) clearTimeout(timerRef.current);
 if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
 const warnIn = remainingMs - Math.min(WARNING_BEFORE_MS, idleMsRef.current / 2);
 warnTimerRef.current = setTimeout(() => {
 warningShown = true;
 showWarning();
 }, Math.max(0, warnIn));
 timerRef.current = setTimeout(() => {
 void expireSession();
 }, remainingMs);
 }

 function resetTimer() {
 const now = Date.now();
 lastActivity = now;
 sendHeartbeat(now);
 if (warningShown) {
 warningShown = false;
 toast.dismiss(WARNING_TOAST_ID);
 }
 schedule(idleMsRef.current);
 }

 resetTimer();

 for (const eventName of ACTIVITY_EVENTS) {
 window.addEventListener(eventName, resetTimer, { passive: true });
 }

 return () => {
 if (timerRef.current) {
 clearTimeout(timerRef.current);
 }
 if (warnTimerRef.current) {
 clearTimeout(warnTimerRef.current);
 }

 for (const eventName of ACTIVITY_EVENTS) {
 window.removeEventListener(eventName, resetTimer);
 }
 };
 }, [router, idleMs]);

 return null;
}
