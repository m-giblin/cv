import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/database.types";
import {
  DEFAULT_SESSION_IDLE_MINUTES,
  MAX_SESSION_IDLE_MINUTES,
  MIN_SESSION_IDLE_MINUTES,
  mergeFeatureFlags,
  sessionIdleMsFromMinutes,
  type PlatformFeatureFlags,
} from "@/lib/platform/settings-shared";

export type PlatformBasicSettings = {
  sessionIdleMinutes: number;
  featureFlags: PlatformFeatureFlags;
  updatedAt: string | null;
};

function clampSessionIdleMinutes(value: number): number {
  return Math.min(MAX_SESSION_IDLE_MINUTES, Math.max(MIN_SESSION_IDLE_MINUTES, Math.round(value)));
}

function rowToSettings(row: {
  session_idle_minutes?: number | null;
  feature_flags?: unknown;
  updated_at?: string | null;
} | null): PlatformBasicSettings {
  return {
    sessionIdleMinutes: clampSessionIdleMinutes(row?.session_idle_minutes ?? DEFAULT_SESSION_IDLE_MINUTES),
    featureFlags: mergeFeatureFlags(row?.feature_flags as PlatformFeatureFlags | undefined),
    updatedAt: row?.updated_at ?? null,
  };
}

export async function loadPlatformBasicSettings(): Promise<PlatformBasicSettings> {
  const admin = createAdminClient();
  if (!admin) {
    return rowToSettings(null);
  }

  const { data, error } = await admin
    .from("platform_settings")
    .select("session_idle_minutes, feature_flags, updated_at")
    .eq("id", "default")
    .maybeSingle();

  if (error || !data) {
    return rowToSettings(null);
  }

  return rowToSettings(data);
}

export async function getSessionIdleMs(): Promise<number> {
  const settings = await loadPlatformBasicSettings();
  return sessionIdleMsFromMinutes(settings.sessionIdleMinutes);
}

export async function savePlatformBasicSettings(
  admin: SupabaseClient<Database>,
  userId: string,
  input: { sessionIdleMinutes?: number; featureFlags?: PlatformFeatureFlags },
): Promise<PlatformBasicSettings> {
  const payload: {
    updated_at: string;
    updated_by: string;
    session_idle_minutes?: number;
    feature_flags?: PlatformFeatureFlags;
  } = {
    updated_at: new Date().toISOString(),
    updated_by: userId,
  };

  if (typeof input.sessionIdleMinutes === "number") {
    payload.session_idle_minutes = clampSessionIdleMinutes(input.sessionIdleMinutes);
  }

  if (input.featureFlags) {
    payload.feature_flags = mergeFeatureFlags(input.featureFlags);
  }

  const { data: updated, error } = await admin
    .from("platform_settings")
    .update(payload)
    .eq("id", "default")
    .select("session_idle_minutes, feature_flags, updated_at")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!updated) {
    const { error: insertError } = await admin.from("platform_settings").insert({
      id: "default",
      provider: "xai",
      model: "grok-3-mini",
      session_idle_minutes: payload.session_idle_minutes ?? DEFAULT_SESSION_IDLE_MINUTES,
      feature_flags: payload.feature_flags ?? mergeFeatureFlags({}),
      updated_at: payload.updated_at,
      updated_by: userId,
    });

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  return loadPlatformBasicSettings();
}
