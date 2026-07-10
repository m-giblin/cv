import { LoginLeftPanel } from "@/components/auth/login-left-panel";
import { LoginRightPanel } from "@/components/auth/login-right-panel";
import { ALLOWED_EMAIL_DOMAIN } from "@/lib/auth/email-domain";

const LOGIN_ERRORS: Record<string, string> = {
 unauthorized_domain: `Only @${ALLOWED_EMAIL_DOMAIN} email addresses can access this platform.`,
 session_expired: "Your session expired after 15 minutes of inactivity. Please sign in again.",
};

const FALLBACK_AVATARS = ["JL", "RP", "SK", "MC"];

/** Static social proof — avoid service-role queries that leak cross-tenant user counts on a public page. */
function getSocialProof() {
 return { count: 47, avatars: FALLBACK_AVATARS };
}

export default async function LoginPage({
 searchParams,
}: {
 searchParams: Promise<{ error?: string }>;
}) {
 const params = await searchParams;
 const { count, avatars } = getSocialProof();
 const initialError = params.error ? (LOGIN_ERRORS[params.error] ?? "Sign-in was denied.") : null;

 return (
 <div className="flex min-h-screen">
 <LoginLeftPanel avatars={avatars} count={count} />
 <LoginRightPanel initialError={initialError} />
 </div>
 );
}
