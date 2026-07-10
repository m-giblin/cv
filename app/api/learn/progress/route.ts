import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
 const supabase = await createClient();

 if (!supabase) {
 return NextResponse.json({ progress: [], configured: false });
 }

 const {
 data: { user },
 } = await supabase.auth.getUser();

 if (!user) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

 const url = new URL(request.url);
 const userId = url.searchParams.get("userId") ?? user.id;

 if (userId !== user.id) {
 const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
 const canView = profile?.role && ["manager", "mentor", "director", "admin"].includes(profile.role);
 if (!canView) {
 return NextResponse.json({ error: "Forbidden" }, { status: 403 });
 }
 }

 const { data, error } = await supabase
 .from("learn_module_progress")
 .select("module_id, completed_at")
 .eq("user_id", userId);

 if (error) {
 return NextResponse.json({ progress: [], configured: false });
 }

 return NextResponse.json({ progress: data ?? [], configured: true });
}

const postSchema = z.object({
 moduleId: z.string().min(2),
});

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

 const parsed = postSchema.safeParse(await request.json());
 if (!parsed.success) {
 return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 }

 const { error } = await supabase.from("learn_module_progress").upsert(
 {
 user_id: user.id,
 module_id: parsed.data.moduleId,
 },
 { onConflict: "user_id,module_id" },
 );

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 return NextResponse.json({ success: true });
}
