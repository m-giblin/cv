import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const trackSchema = z.object({
  resourceLabel: z.string().min(2),
  resourceUrl: z.string().optional(),
  accountName: z.string().optional(),
  eventType: z.enum(["open", "share", "download", "view_brief"]),
});

export async function POST(request: Request) {
  const supabase = await createClient();

  if (!supabase) {
    return NextResponse.json({ success: true, configured: false });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = trackSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { error } = await supabase.from("resource_engagement").insert({
    user_id: user.id,
    resource_label: parsed.data.resourceLabel,
    resource_url: parsed.data.resourceUrl ?? null,
    account_name: parsed.data.accountName ?? null,
    event_type: parsed.data.eventType,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function GET() {
  const supabase = await createClient();

  if (!supabase) {
    return NextResponse.json({
      metrics: [
        { label: "Deal prep briefs opened", value: 0, delta: "Connect Supabase" },
        { label: "Resource links shared", value: 0, delta: "—" },
        { label: "Avg. engagements / week", value: "—", delta: "—" },
      ],
    });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = new Date();
  since.setDate(since.getDate() - 7);

  const { data: events } = await supabase
    .from("resource_engagement")
    .select("event_type, account_name, created_at")
    .eq("user_id", user.id)
    .gte("created_at", since.toISOString());

  const rows = events ?? [];
  const briefOpens = rows.filter((e) => e.event_type === "view_brief").length;
  const shares = rows.filter((e) => e.event_type === "share").length;
  const accounts = new Set(rows.map((e) => e.account_name).filter(Boolean)).size;

  return NextResponse.json({
    metrics: [
      { label: "Deal prep briefs opened", value: briefOpens, delta: "Last 7 days" },
      { label: "Resource links shared", value: shares, delta: `${accounts} account${accounts === 1 ? "" : "s"}` },
      {
        label: "Total engagements",
        value: rows.length,
        delta: "Last 7 days",
      },
    ],
  });
}
