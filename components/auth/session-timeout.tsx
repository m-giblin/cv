"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SESSION_IDLE_MS } from "@/lib/auth/rbac";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/client";

const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart", "mousemove"] as const;

export function SessionTimeout() {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        description: "You were signed out after 15 minutes of inactivity.",
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
      }, SESSION_IDLE_MS);
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
  }, [router]);

  return null;
}
