import { NextResponse } from "next/server";
import { z } from "zod";
import { auditMutation } from "@/lib/audit/audit-mutation";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { getDashboardData } from "@/lib/data/get-dashboard-data";

const patchSchema = z.object({
 seUserId: z.string().uuid(),
 notes: z.string().max(10000),
});

export async function GET(request: Request) {
 const session = await requireManagerSession();
 if (session instanceof NextResponse) {
 return session;
 }

 const url = new URL(request.url);
 const seUserId = url.searchParams.get("seUserId");

 if (!seUserId) {
 return NextResponse.json({ error: "seUserId required" }, { status: 400 });
 }

 const { data: dashboard } = await getDashboardData();
 const orgIds = new Set(dashboard.myOrg.map((profile) => profile.id));

 if (!orgIds.has(seUserId)) {
 return NextResponse.json({ error: "Forbidden" }, { status: 403 });
 }

 const { data: noteRow, error } = await session.supabase
 .from("manager_coaching_notes")
 .select("notes, updated_at")
 .eq("manager_id", session.user.id)
 .eq("se_user_id", seUserId)
 .maybeSingle();

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 return NextResponse.json({
 notes: noteRow?.notes ?? "",
 updatedAt: noteRow?.updated_at ?? null,
 });
}

export async function PUT(request: Request) {
 const session = await requireManagerSession();
 if (session instanceof NextResponse) {
 return session;
 }

 const parsed = patchSchema.safeParse(await request.json());
 if (!parsed.success) {
 return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 }

 const { data: dashboard } = await getDashboardData();
 const orgIds = new Set(dashboard.myOrg.map((profile) => profile.id));

 if (!orgIds.has(parsed.data.seUserId)) {
 return NextResponse.json({ error: "Forbidden" }, { status: 403 });
 }

 const { error } = await session.supabase.from("manager_coaching_notes").upsert(
 {
 manager_id: session.user.id,
 se_user_id: parsed.data.seUserId,
 notes: parsed.data.notes,
 },
 { onConflict: "manager_id,se_user_id" },
 );

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 auditMutation(
 session.user.id,
 "coaching_note.updated",
 "manager_coaching_note",
 parsed.data.seUserId,
 { length: parsed.data.notes.length },
 session.tenantId,
 );

 return NextResponse.json({ success: true });
}
