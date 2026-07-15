import type { SupabaseClient } from "@supabase/supabase-js";

const DAILY_REQUEST_LIMIT = 80;
const DAILY_TOKEN_LIMIT = 120_000;

export type AiRateLimitResult =
  | { allowed: true; remainingRequests: number }
  | { allowed: false; reason: string; retryAfterHours: number };

export async function checkAiRateLimit(
  supabase: SupabaseClient,
  userId: string,
): Promise<AiRateLimitResult> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("ai_usage_logs")
    .select("total_tokens")
    .eq("user_id", userId)
    .gte("created_at", startOfDay.toISOString());

  if (error) {
    // Fail closed: this limiter guards a shared, paid provider key, so a DB/RLS
    // hiccup must not silently disable the daily cap (financial-DoS lever).
    return {
      allowed: false,
      reason: "Usage checks are temporarily unavailable. Please try again shortly.",
      retryAfterHours: 1,
    };
  }

  const rows = data ?? [];
  const requestCount = rows.length;
  const tokenCount = rows.reduce((sum, row) => sum + (row.total_tokens ?? 0), 0);

  if (requestCount >= DAILY_REQUEST_LIMIT) {
    return {
      allowed: false,
      reason: `Daily AI request limit reached (${DAILY_REQUEST_LIMIT}). Try again tomorrow.`,
      retryAfterHours: hoursUntilUtcMidnight(),
    };
  }

  if (tokenCount >= DAILY_TOKEN_LIMIT) {
    return {
      allowed: false,
      reason: `Daily AI token budget reached. Contact your admin if you need more capacity.`,
      retryAfterHours: hoursUntilUtcMidnight(),
    };
  }

  return { allowed: true, remainingRequests: DAILY_REQUEST_LIMIT - requestCount };
}

function hoursUntilUtcMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setUTCHours(24, 0, 0, 0);
  return Math.ceil((midnight.getTime() - now.getTime()) / (1000 * 60 * 60));
}

export function aiRateLimitResponse(result: Extract<AiRateLimitResult, { allowed: false }>) {
  return Response.json(
    { error: result.reason, retryAfterHours: result.retryAfterHours },
    { status: 429, headers: { "Retry-After": String(result.retryAfterHours * 3600) } },
  );
}
