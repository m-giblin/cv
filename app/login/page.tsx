import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { ALLOWED_EMAIL_DOMAIN } from "@/lib/auth/email-domain";

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
  const initialError = params.error ? LOGIN_ERRORS[params.error] ?? "Sign-in was denied." : null;

  return (
    <AuthShell
      description={`Sign in with your @${ALLOWED_EMAIL_DOMAIN} credentials. Multi-factor authentication is required before you can access enablement dashboards.`}
      eyebrow="Secure sign-in"
      title="SE Enablement Platform"
    >
      <LoginForm initialError={initialError} />
    </AuthShell>
  );
}
