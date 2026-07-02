import { AuthShell } from "@/components/auth/auth-shell";
import { MfaVerifyForm } from "@/components/auth/mfa-verify-form";

export default function MfaVerifyPage() {
  return (
    <AuthShell
      description="Enter the 6-digit code from your authenticator app to complete sign-in."
      eyebrow="MFA verification"
      title="Confirm it's you"
    >
      <MfaVerifyForm />
    </AuthShell>
  );
}
