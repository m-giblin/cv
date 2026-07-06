import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/database.types";
import {
  DEFAULT_ACTIVITY_LOG_RETENTION_DAYS,
  DEFAULT_AI_USAGE_RETENTION_DAYS,
  DEFAULT_AUDIT_LOG_RETENTION_DAYS,
  DEFAULT_SESSION_IDLE_MINUTES,
  MAX_RETENTION_DAYS,
  MAX_SESSION_IDLE_MINUTES,
  MIN_RETENTION_DAYS,
  MIN_SESSION_IDLE_MINUTES,
  mergeFeatureFlags,
  sessionIdleMsFromMinutes,
  type PlatformFeatureFlags,
} from "@/lib/platform/settings-shared";

export type PlatformSettings = {
  sessionIdleMinutes: number;
  featureFlags: PlatformFeatureFlags;
  auditLogRetentionDays: number;
  activityLogRetentionDays: number;
  aiUsageRetentionDays: number;
  updatedAt: string | null;
};

/** @deprecated use PlatformSettings */
export type PlatformBasicSettings = PlatformSettings;

function clampRetentionDays(value: number): number {
  return Math.min(MAX_RETENTION_DAYS, Math.max(MIN_RETENTION_DAYS, Math.round(value)));
}

function clampSessionIdleMinutes(value: number): number {
  return Math.min(MAX_SESSION_IDLE_MINUTES, Math.max(MIN_SESSION_IDLE_MINUTES, Math.round(value)));
}

function rowToSettings(row: {
  session_idle_minutes?: number | null;
  feature_flags?: unknown;
  audit_log_retention_days?: number | null;
  activity_log_retention_days?: number | null;
  ai_usage_retention_days?: number | null;
  updated_at?: string | null;
} | null): PlatformSettings {
  return {
    sessionIdleMinutes: clampSessionIdleMinutes(row?.session_idle_minutes ?? DEFAULT_SESSION_IDLE_MINUTES),
    featureFlags: mergeFeatureFlags(row?.feature_flags as PlatformFeatureFlags | undefined),
    auditLogRetentionDays: clampRetentionDays(row?.audit_log_retention_days ?? DEFAULT_AUDIT_LOG_RETENTION_DAYS),
    activityLogRetentionDays: clampRetentionDays(
      row?.activity_log_retention_days ?? DEFAULT_ACTIVITY_LOG_RETENTION_DAYS,
    ),
    aiUsageRetentionDays: clampRetentionDays(row?.ai_usage_retention_days ?? DEFAULT_AI_USAGE_RETENTION_DAYS),
    updatedAt: row?.updated_at ?? null,
  };
}

export async function loadPlatformSettings(): Promise<PlatformSettings> {
  const admin = createAdminClient();
  if (!admin) {
    return rowToSettings(null);
  }

  const { data, error } = await admin
    .from("platform_settings")
    .select(
      "session_idle_minutes, feature_flags, audit_log_retention_days, activity_log_retention_days, ai_usage_retention_days, updated_at",
    )
    .eq("id", "default")
    .maybeSingle();

  if (error || !data) {
    return rowToSettings(null);
  }

  return rowToSettings(data);
}

export const loadPlatformBasicSettings = loadPlatformSettings;

export async function getSessionIdleMs(): Promise<number> {
  const settings = await loadPlatformSettings();
  return sessionIdleMsFromMinutes(settings.sessionIdleMinutes);
}

export async function savePlatformSettings(
  admin: SupabaseClient<Database>,
  userId: string,
  input: {
    sessionIdleMinutes?: number;
    featureFlags?: PlatformFeatureFlags;
    auditLogRetentionDays?: number;
    activityLogRetentionDays?: number;
    aiUsageRetentionDays?: number;
  },
): Promise<PlatformSettings> {
  const payload: {
    updated_at: string;
    updated_by: string;
    session_idle_minutes?: number;
    feature_flags?: PlatformFeatureFlags;
    audit_log_retention_days?: number;
    activity_log_retention_days?: number;
    ai_usage_retention_days?: number;
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
  if (typeof input.auditLogRetentionDays === "number") {
    payload.audit_log_retention_days = clampRetentionDays(input.auditLogRetentionDays);
  }
  if (typeof input.activityLogRetentionDays === "number") {
    payload.activity_log_retention_days = clampRetentionDays(input.activityLogRetentionDays);
  }
  if (typeof input.aiUsageRetentionDays === "number") {
    payload.ai_usage_retention_days = clampRetentionDays(input.aiUsageRetentionDays);
  }

  const { data: updated, error } = await admin
    .from("platform_settings")
    .update(payload)
    .eq("id", "default")
    .select(
      "session_idle_minutes, feature_flags, audit_log_retention_days, activity_log_retention_days, ai_usage_retention_days, updated_at",
    )
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
      audit_log_retention_days: payload.audit_log_retention_days ?? DEFAULT_AUDIT_LOG_RETENTION_DAYS,
      activity_log_retention_days: payload.activity_log_retention_days ?? DEFAULT_ACTIVITY_LOG_RETENTION_DAYS,
      ai_usage_retention_days: payload.ai_usage_retention_days ?? DEFAULT_AI_USAGE_RETENTION_DAYS,
      updated_at: payload.updated_at,
      updated_by: userId,
    });

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  return loadPlatformSettings();
}

export const savePlatformBasicSettings = savePlatformSettings;
