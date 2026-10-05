import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { ALLOWED_EMAIL_DOMAIN, allowedEmailDomainsLabel } from "@/lib/auth/email-domain";

const LOGIN_ERRORS: Record<string, string> = {
  unauthorized_domain: `Only @${ALLOWED_EMAIL_DOMAIN} email addresses can access this platform.`,
  session_expired: "Your session expired after 15 minutes of inactivity. Please sign in again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const initialError = params.error ? (LOGIN_ERRORS[params.error] ?? "Sign-in was denied.") : null;

  return (
    <AuthShell
      description={`Use your work email (${allowedEmailDomainsLabel()}). You'll confirm with your authenticator next.`}
      eyebrow="Step 1 of 2 · Sign in"
      title="Welcome back"
    >
      <LoginForm initialError={initialError} />
    </AuthShell>
  );
}
