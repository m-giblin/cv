import { LoginLeftPanel } from "@/components/auth/login-left-panel";
import { LoginRightPanel } from "@/components/auth/login-right-panel";
import { ALLOWED_EMAIL_DOMAIN } from "@/lib/auth/email-domain";
import { createAdminClient } from "@/lib/supabase/admin";

const LOGIN_ERRORS: Record<string, string> = {
  unauthorized_domain: `Only @${ALLOWED_EMAIL_DOMAIN} email addresses can access this platform.`,
  session_expired: "Your session expired after 15 minutes of inactivity. Please sign in again.",
};

const FALLBACK_AVATARS = ["JL", "RP", "SK", "MC"];

async function getSocialProof() {
  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return { count: 47, avatars: FALLBACK_AVATARS };
    }

    const [{ count }, { data: recent }] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase
        .from("activity_logs")
        .select("user_id")
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

    const userIds = [...new Set((recent ?? []).map((row) => row.user_id))].slice(0, 4);
    let avatars: string[] = [];

    if (userIds.length >= 2) {
      const { data: profiles } = await supabase.from("profiles").select("full_name").in("id", userIds);
      avatars = (profiles ?? [])
        .map((profile) =>
          profile.full_name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase(),
        )
        .filter((initials) => initials.length > 0);
    }

    return {
      count: count ?? 47,
      avatars: avatars.length >= 2 ? avatars : FALLBACK_AVATARS,
    };
  } catch {
    return { count: 47, avatars: FALLBACK_AVATARS };
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const { count, avatars } = await getSocialProof();
  const initialError = params.error ? (LOGIN_ERRORS[params.error] ?? "Sign-in was denied.") : null;

  return (
    <div className="flex min-h-screen">
      <LoginLeftPanel avatars={avatars} count={count} />
      <LoginRightPanel initialError={initialError} />
    </div>
  );
}
