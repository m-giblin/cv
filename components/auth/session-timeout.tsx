"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SESSION_IDLE_MS } from "@/lib/auth/rbac";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { DEFAULT_SESSION_IDLE_MINUTES } from "@/lib/platform/settings-shared";
import { createClient } from "@/lib/supabase/client";

const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart", "mousemove"] as const;

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

    async function expireSession() {
      const {
        data: { user },
      } = await client.auth.getUser();

      if (!user) {
        return;
      }

      await client.auth.signOut();
      toast.message("Session expired", {
        description: `You were signed out after ${formatIdleLabel(idleMinutesRef.current)} of inactivity.`,
      });
      router.push(`${AUTH_ROUTES.login}?error=session_expired`);
      router.refresh();
    }

    function resetTimer() {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        void expireSession();
      }, idleMsRef.current);
    }

    resetTimer();

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, resetTimer, { passive: true });
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, resetTimer);
      }
    };
  }, [router, idleMs]);

  return null;
}
