import { AuthShell } from "@/components/auth/auth-shell";
import { MfaEnrollForm } from "@/components/auth/mfa-enroll-form";

export default function MfaEnrollPage() {
  return (
    <AuthShell
      backLink={{ href: "/login", label: "Back to sign in" }}
      description="Scan the QR code, then enter a code to turn on MFA."
      eyebrow="Step 2 of 2 / Enroll MFA"
      title="Set up your authenticator."
    >
      <MfaEnrollForm />
    </AuthShell>
  );
}
