import Link from "next/link";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { requirePathAccess } from "@/lib/auth/require-access";

export default async function ChangePasswordPage({ searchParams }: { searchParams: Promise<{ required?: string }> }) {
  await requirePathAccess("/account/change-password");
  // Middleware sends people here with ?required=1 until they replace a temporary password.
  const required = (await searchParams).required === "1";

  return (
    <>
      <PageHeader eyebrow="Account security" title={required ? "Set your password" : "Change password"} />
      <PageBody className="pb-8">
        {required ? null : (
          <>
            <Link className="link mb-5 inline-block text-sm" href="/account">
              Back to account
            </Link>
            <p className="mb-5 max-w-xl text-[15px] leading-normal text-ink-2">
              Confirm your authenticator code, then set a new password. MFA is required even if someone knows your current
              password.
            </p>
          </>
        )}
        <div className="max-w-xl rounded-[14px] border border-line bg-white p-6">
          <ChangePasswordForm required={required} />
        </div>
      </PageBody>
    </>
  );
}
