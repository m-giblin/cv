import { AuthShell } from "@/components/auth/auth-shell";
import { MfaEnrollForm } from "@/components/auth/mfa-enroll-form";

export default function MfaEnrollPage() {
  return (
    <AuthShell
      description="Register an authenticator app to protect your account. You will need this code every time you sign in."
      eyebrow="Mandatory MFA setup"
      title="Set up authenticator"
    >
      <MfaEnrollForm />
    </AuthShell>
  );
}
