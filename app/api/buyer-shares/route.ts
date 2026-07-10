import { NextResponse } from "next/server";
import { z } from "zod";
import { buildRoomPayloadFromPrep, newShareToken, shareUrl } from "@/lib/buyer-shares/room";
import { dealPrepSchema } from "@/lib/ai/schemas";
import { createClient } from "@/lib/supabase/server";

const createSchema = z.object({
 prepSessionId: z.string().uuid().optional(),
 accountName: z.string().min(2),
 title: z.string().min(3),
 prepOutput: dealPrepSchema,
});

export async function GET() {
 const supabase = await createClient();
 if (!supabase) {
 return NextResponse.json({ rooms: [] });
 }

 const {
 data: { user },
 } = await supabase.auth.getUser();
 if (!user) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

 const { data: rows } = await supabase
 .from("buyer_share_rooms")
 .select("id, token, account_name, title, view_count, created_at")
 .eq("user_id", user.id)
 .order("created_at", { ascending: false })
 .limit(20);

 return NextResponse.json({
 rooms: (rows ?? []).map((row) => ({
 ...row,
 shareUrl: shareUrl(row.token),
 })),
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

 const parsed = createSchema.safeParse(await request.json());
 if (!parsed.success) {
 return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 }

 const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
 const token = newShareToken();
 const payload = buildRoomPayloadFromPrep(
 { ...parsed.data.prepOutput, accountName: parsed.data.accountName },
 { seName: profile?.full_name ?? undefined },
 );

 const expiresAt = new Date();
 expiresAt.setDate(expiresAt.getDate() + 90);

 const { data, error } = await supabase
 .from("buyer_share_rooms")
 .insert({
 token,
 user_id: user.id,
 prep_session_id: parsed.data.prepSessionId ?? null,
 account_name: parsed.data.accountName,
 title: parsed.data.title,
 room_payload: payload,
 expires_at: expiresAt.toISOString(),
 })
 .select("id, token")
 .single();

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 return NextResponse.json({
 id: data.id,
 token: data.token,
 shareUrl: shareUrl(data.token),
 });
}
