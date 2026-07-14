import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aiRateLimitResponse, checkAiRateLimit } from "@/lib/ai/rate-limit";

export async function enforceAiRateLimit(
  supabase: SupabaseClient,
  userId: string,
): Promise<NextResponse | null> {
  const limit = await checkAiRateLimit(supabase, userId);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: limit.reason, retryAfterHours: limit.retryAfterHours },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterHours * 3600) } },
    );
  }
  return null;
}
