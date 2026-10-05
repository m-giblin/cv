import { AuthShell } from "@/components/auth/auth-shell";
import { MfaVerifyForm } from "@/components/auth/mfa-verify-form";

export default function MfaVerifyPage() {
  return (
    <AuthShell
      aside={{
        eyebrow: "One more step",
        heading: "Confirm it's you.",
        body: "Multi-factor authentication protects coaching data, readiness scores and customer prep.",
        steps: [
          "Open your authenticator app",
          "Enter the 6-digit code. It refreshes every 30 seconds",
          "You land in your workspace",
        ],
      }}
      backLink={{ href: "/login", label: "Back to sign in" }}
      description="Enter the 6-digit code from your authenticator app."
      eyebrow="Step 2 of 2 · Verify"
      title="Confirm it's you"
    >
      <MfaVerifyForm />
      <p className="mt-6 rounded-[10px] bg-surface-2 px-4 py-3 text-sm leading-normal text-ink-2">
        <strong className="font-semibold text-ink">Can&apos;t reach your authenticator?</strong> Ask your manager or IT
        admin to reset MFA.
      </p>
    </AuthShell>
  );
}
