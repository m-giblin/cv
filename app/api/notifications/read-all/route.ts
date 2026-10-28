import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Marks every unread notification read, or only those linking under `actionUrlPrefix` when given. */
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

 const body = (await request.json().catch(() => null)) as { actionUrlPrefix?: unknown } | null;
 const prefix = typeof body?.actionUrlPrefix === "string" && body.actionUrlPrefix.startsWith("/") ? body.actionUrlPrefix : null;

 let query = supabase
 .from("notifications")
 .update({ read_at: new Date().toISOString() })
 .eq("user_id", user.id)
 .is("read_at", null);
 if (prefix) query = query.like("action_url", `${prefix.replace(/[%_]/g, "\\$&")}%`);
 const { error } = await query;

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 return NextResponse.json({ success: true });
}
