import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
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

 const { error } = await supabase
 .from("notifications")
 .update({ read_at: new Date().toISOString() })
 .eq("user_id", user.id)
 .is("read_at", null);

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 return NextResponse.json({ success: true });
}
