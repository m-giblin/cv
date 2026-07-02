import { NextResponse } from "next/server";
import { z } from "zod";
import { FULL_PREP_LIMIT, RECENT_PREP_LIMIT } from "@/lib/deal-prep/constants";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/database.types";

const schema = z.object({
  accountName: z.string().min(2),
  industry: z.string().min(2),
  solutions: z.array(z.string()).min(1),
  accountContext: z.string().optional(),
  prepOutput: z.record(z.string(), z.unknown()),
});

export async function GET(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") === "all" ? "all" : "recent";
  const query = url.searchParams.get("q")?.trim() ?? "";

  const { count: totalCount, error: countError } = await supabase
    .from("deal_prep_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  const total = totalCount ?? 0;
  const useFullHistory = scope === "all" || query.length > 0;
  const limit = useFullHistory ? FULL_PREP_LIMIT : RECENT_PREP_LIMIT;

  let sessionsQuery = supabase
    .from("deal_prep_sessions")
    .select("id, account_name, industry, solutions, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (query.length > 0) {
    const escaped = query.replace(/[%_,]/g, "");
    sessionsQuery = sessionsQuery.or(
      `account_name.ilike.%${escaped}%,industry.ilike.%${escaped}%`,
    );
  }

  const { data, error } = await sessionsQuery;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sessions = data ?? [];
  const effectiveScope = useFullHistory ? "all" : "recent";

  return NextResponse.json({
    sessions,
    total,
    scope: effectiveScope,
    query,
    recentLimit: RECENT_PREP_LIMIT,
    searchEnabled: total >= RECENT_PREP_LIMIT,
    hasOlder:
      effectiveScope === "recent" && total > RECENT_PREP_LIMIT && query.length === 0,
    showing: sessions.length,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("deal_prep_sessions")
    .insert({
      user_id: user.id,
      account_name: parsed.data.accountName,
      industry: parsed.data.industry,
      solutions: parsed.data.solutions,
      account_context: parsed.data.accountContext ?? null,
      prep_output: parsed.data.prepOutput as Json,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { id: string };
  const { data, error } = await supabase
    .from("deal_prep_sessions")
    .select("*")
    .eq("id", body.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({ session: data });
}
