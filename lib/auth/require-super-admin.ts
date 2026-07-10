import { NextResponse } from "next/server";
import { User } from "@supabase/supabase-js";
import { getAccessTier } from "@/lib/auth/rbac";
import { createClient } from "@/lib/supabase/server";
import { ProfileRole } from "@/lib/types";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/lib/database.types";

export type SuperAdminSession = {
  supabase: SupabaseClient<Database>;
  user: User;
  role: ProfileRole;
};

export async function requireSuperAdminSession(): Promise<SuperAdminSession | NextResponse> {
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

  if (!role || getAccessTier(role) !== "super_admin") {
    return NextResponse.json({ error: "Super-admin access required." }, { status: 403 });
  }

  return { supabase, user, role };
}
