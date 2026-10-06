import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <AuthShell
      description="Choose a new password for your SE Enablement account."
      eyebrow="Password reset"
      title="Set a new password"
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
