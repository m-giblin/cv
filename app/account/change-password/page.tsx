import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { requireAppAccess } from "@/lib/auth/require-access";

export default async function ChangePasswordPage() {
  const { data } = await requireAppAccess("/account/change-password");

  return (
    <AppShell currentUser={data.currentUser} notifications={data.notifications}>
      <PageHeader eyebrow="Account security" title="Change password" />
      <PageBody className="pb-8">
        <Link className="link mb-5 inline-block text-sm" href="/account">
          Back to account
        </Link>
        <p className="mb-5 max-w-xl text-[15px] leading-normal text-ink-2">
          Confirm your authenticator code, then set a new password. MFA is required even if someone knows your current
          password.
        </p>
        <div className="max-w-xl rounded-[14px] border border-line bg-white p-6">
          <ChangePasswordForm />
        </div>
      </PageBody>
    </AppShell>
  );
}
