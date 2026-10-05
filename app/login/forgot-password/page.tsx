import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { allowedEmailDomainsLabel } from "@/lib/auth/email-domain";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      backLink={{ href: "/login", label: "Back to sign in" }}
      description={`We'll email you a secure link to reset your password. Only ${allowedEmailDomainsLabel()} accounts are supported.`}
      eyebrow="Password recovery"
      title="Reset your password"
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
