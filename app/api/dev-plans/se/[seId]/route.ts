import { NextResponse } from "next/server";
import { canViewUserDevelopmentPlan } from "@/lib/development/authorize";
import { createClient } from "@/lib/supabase/server";
import { fetchSeGrowthPlanForUser } from "@/lib/se/fetch-se-growth-plan";

export async function GET(_request: Request, context: { params: Promise<{ seId: string }> }) {
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

  const { seId } = await context.params;

  if (!(await canViewUserDevelopmentPlan(seId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = await fetchSeGrowthPlanForUser(seId);
  return NextResponse.json(payload);
}
