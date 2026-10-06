import { AuthShell } from "@/components/auth/auth-shell";
import { MfaVerifyDescription, MfaVerifyForm } from "@/components/auth/mfa-verify-form";

export default function MfaVerifyPage() {
  return (
    <AuthShell description={<MfaVerifyDescription />} eyebrow="Step 2 of 2 / Verify" title="Check your authenticator.">
      <MfaVerifyForm />
    </AuthShell>
  );
}
