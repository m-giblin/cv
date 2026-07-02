import { NextResponse } from "next/server";
import { User } from "@supabase/supabase-js";
import { SupabaseClient } from "@supabase/supabase-js";
import { getAccessTier } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/lib/database.types";
import { ProfileRole } from "@/lib/types";

type ManagerSession = {
  supabase: SupabaseClient<Database>;
  user: User;
  role: ProfileRole;
};

export async function requireManagerSession(): Promise<ManagerSession | NextResponse> {
  const supabase = await createClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, email, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile as { role: ProfileRole } | null)?.role;

  if (!role) {
    return NextResponse.json({ error: "Profile not found." }, { status: 403 });
  }

  const tier = getAccessTier(role);

  if (tier !== "admin" && tier !== "manager") {
    return NextResponse.json({ error: "Manager access required." }, { status: 403 });
  }

  return { supabase, user, role };
}
