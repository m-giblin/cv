import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const trackSchema = z.object({
  eventType: z.enum(["room_view", "resource_open", "resource_download", "time_on_page"]),
  resourceLabel: z.string().optional(),
  viewerFingerprint: z.string().optional(),
  durationSeconds: z.number().int().optional(),
});

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const admin = createAdminClient();

  if (!admin) {
    return NextResponse.json({ success: true, configured: false });
  }

  const parsed = trackSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: room } = await admin
    .from("buyer_share_rooms")
    .select("id, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!room) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (room.expires_at && new Date(room.expires_at) < new Date()) {
    return NextResponse.json({ error: "Expired" }, { status: 410 });
  }

  await admin.from("buyer_share_events").insert({
    room_id: room.id,
    event_type: parsed.data.eventType,
    resource_label: parsed.data.resourceLabel ?? null,
    viewer_fingerprint: parsed.data.viewerFingerprint ?? null,
    metadata: { durationSeconds: parsed.data.durationSeconds ?? null },
  });

  if (parsed.data.eventType === "room_view") {
    const { data: current } = await admin.from("buyer_share_rooms").select("view_count").eq("id", room.id).single();
    await admin
      .from("buyer_share_rooms")
      .update({ view_count: (current?.view_count ?? 0) + 1 })
      .eq("id", room.id);
  }

  return NextResponse.json({ success: true });
}
