import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BuyerRoomPayload } from "@/lib/buyer-shares/room";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const admin = createAdminClient();

  if (!admin) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const { data: room } = await admin
    .from("buyer_share_rooms")
    .select("id, account_name, title, room_payload, expires_at, view_count")
    .eq("token", token)
    .maybeSingle();

  if (!room) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (room.expires_at && new Date(room.expires_at) < new Date()) {
    return NextResponse.json({ error: "Expired" }, { status: 410 });
  }

  return NextResponse.json({
    accountName: room.account_name,
    title: room.title,
    payload: room.room_payload as BuyerRoomPayload,
    viewCount: room.view_count,
  });
}
