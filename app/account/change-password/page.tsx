import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { SEPageLayout } from "@/components/se/se-page-layout";
import { requireAppAccess } from "@/lib/auth/require-access";

export default async function ChangePasswordPage() {
  const { data } = await requireAppAccess("/account/change-password");

  return (
    <AppShell currentUser={data.currentUser} notifications={data.notifications}>
      <SEPageLayout
        eyebrow="Account security"
        eyebrowColor="#0071ce"
        subtitle="Verify your authenticator app, then set a new password. MFA is required even if someone knows your current password."
        title="Change password"
      >
        <Link
          className="mb-4 inline-flex text-[12px] font-semibold text-[#0071ce] transition hover:text-[#0057a8]"
          href="/account"
        >
          ← Back to account
        </Link>

        <div className="max-w-xl rounded-xl border border-[#e2eaf5] bg-white p-[18px_22px] shadow-[0_1px_4px_rgba(0,20,58,0.04)]">
          <ChangePasswordForm />
        </div>
      </SEPageLayout>
    </AppShell>
  );
}
