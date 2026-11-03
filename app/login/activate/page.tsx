import { ActivateAccountForm } from "@/components/auth/activate-account-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata = { title: "Activate your account" };

export default function ActivatePage() {
  return (
    <AuthShell
      backLink={{ href: "/login", label: "Back to sign in" }}
      description="Enter the activation code your admin gave you and choose your password. Then you'll set up your authenticator app."
      eyebrow="New account"
      title="Activate your account"
    >
      <ActivateAccountForm />
    </AuthShell>
  );
}
