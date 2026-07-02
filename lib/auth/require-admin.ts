import { NextResponse } from "next/server";
import { User } from "@supabase/supabase-js";
import { getAccessTier } from "@/lib/auth/rbac";
import { isAllowedEmail, allowedEmailDomainsLabel } from "@/lib/auth/email-domain";
import { createClient } from "@/lib/supabase/server";
import { ProfileRole } from "@/lib/types";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/lib/database.types";

type AdminSession = {
  supabase: SupabaseClient<Database>;
  user: User;
  role: ProfileRole;
};

export async function requireAdminSession(): Promise<AdminSession | NextResponse> {
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

  if (!role || getAccessTier(role) !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  return { supabase, user, role };
}

export function validateAllowedEmail(email: string) {
  if (!isAllowedEmail(email)) {
    return `Email must use ${allowedEmailDomainsLabel()}.`;
  }

  return null;
}

/** @deprecated use validateAllowedEmail */
export function validateSailPointEmail(email: string) {
  return validateAllowedEmail(email);
}
