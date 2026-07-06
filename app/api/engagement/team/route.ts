import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ rows: [], summary: { total: 0, accounts: 0, shares: 0, buyerViews: 0 } });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const isManager = profile?.role && ["manager", "mentor", "director", "admin"].includes(profile.role);

  if (!isManager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const days = Number(url.searchParams.get("days") ?? 14);
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data: org } = await supabase.from("profiles").select("id, full_name").eq("manager_id", user.id);
  const orgIds = (org ?? []).map((row) => row.id);
  if (orgIds.length === 0) {
    return NextResponse.json({ rows: [], summary: { total: 0, accounts: 0, shares: 0, buyerViews: 0 }, topSe: [] });
  }

  const nameById = new Map((org ?? []).map((p) => [p.id, p.full_name]));

  const { data: seEvents } = await supabase
    .from("resource_engagement")
    .select("user_id, account_name, event_type, resource_label, created_at")
    .in("user_id", orgIds)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false });

  const { data: rooms } = await supabase
    .from("buyer_share_rooms")
    .select("id, user_id, account_name, title, view_count")
    .in("user_id", orgIds);

  const roomIds = (rooms ?? []).map((r) => r.id);
  const { data: buyerEvents } = roomIds.length
    ? await supabase
        .from("buyer_share_events")
        .select("room_id, event_type, resource_label, created_at")
        .in("room_id", roomIds)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
    : { data: [] };

  const roomById = new Map((rooms ?? []).map((r) => [r.id, r]));

  const rows: Array<{
    seName: string;
    accountName: string;
    eventType: string;
    resourceLabel: string;
    createdAt: string;
    source: "se" | "buyer";
  }> = [];

  for (const event of seEvents ?? []) {
    rows.push({
      seName: nameById.get(event.user_id) ?? "SE",
      accountName: event.account_name ?? "—",
      eventType: event.event_type,
      resourceLabel: event.resource_label,
      createdAt: event.created_at,
      source: "se",
    });
  }

  for (const event of buyerEvents ?? []) {
    const room = roomById.get(event.room_id);
    if (!room) continue;
    rows.push({
      seName: nameById.get(room.user_id) ?? "SE",
      accountName: room.account_name,
      eventType: `buyer_${event.event_type}`,
      resourceLabel: event.resource_label ?? room.title,
      createdAt: event.created_at,
      source: "buyer",
    });
  }

  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const shares = rows.filter((r) => r.eventType === "share" || r.eventType === "buyer_resource_open").length;
  const accounts = new Set(rows.map((r) => r.accountName).filter((a) => a !== "—")).size;
  const buyerViews = rows.filter((r) => r.source === "buyer").length;

  const bySe = new Map<string, number>();
  for (const row of rows) {
    const se = row.seName;
    bySe.set(se, (bySe.get(se) ?? 0) + 1);
  }

  const topSe = [...bySe.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([seName, count]) => ({ seName, count }));

  return NextResponse.json({
    rows: rows.slice(0, 40),
    summary: { total: rows.length, accounts, shares, buyerViews },
    topSe,
    days,
  });
}
