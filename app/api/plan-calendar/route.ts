import { NextResponse } from "next/server";
import { canViewUserDevelopmentPlan } from "@/lib/development/authorize";
import { createClient } from "@/lib/supabase/server";
import { fetchSePlanCalendarForUser } from "@/lib/se/fetch-se-plan-calendar";

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

  const seId = new URL(request.url).searchParams.get("seId") ?? user.id;

  if (!(await canViewUserDevelopmentPlan(seId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = await fetchSePlanCalendarForUser(seId);
  return NextResponse.json(payload);
}
