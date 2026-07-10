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

 <div className="max-w-xl border border-[#E2DFD9] bg-white p-[18px_22px] ">
 <ChangePasswordForm />
 </div>
 </SEPageLayout>
 </AppShell>
 );
}
