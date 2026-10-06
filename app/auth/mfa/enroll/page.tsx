import { AuthShell } from "@/components/auth/auth-shell";
import { MfaEnrollForm } from "@/components/auth/mfa-enroll-form";

export default function MfaEnrollPage() {
  return (
    <AuthShell
      aside={{
        eyebrow: "One more step",
        heading: "Set up your authenticator.",
        body: "Multi-factor authentication protects coaching data, readiness scores and customer prep.",
        steps: [
          "Scan the QR code with Google Authenticator, 1Password, Okta Verify or Authy",
          "Enter the 6-digit code it shows",
          "MFA is on. You land in your workspace",
        ],
      }}
      backLink={{ href: "/login", label: "Back to sign in" }}
      description="Scan the QR code, then enter a code to turn on MFA."
      eyebrow="Step 2 of 2 / Enroll MFA"
      title="Set up your authenticator"
    >
      <MfaEnrollForm />
    </AuthShell>
  );
}
