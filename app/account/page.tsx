import { AppShell } from "@/components/app-shell";
import { AccountProfilePanel } from "@/components/account/account-profile-panel";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { SEPageLayout } from "@/components/se/se-page-layout";
import { computeAccountBadges } from "@/lib/account/achievements";
import { requireAppAccess } from "@/lib/auth/require-access";
import { fetchCertificationsForUsers } from "@/lib/data/get-certifications-data";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AccountPage() {
  const { data, source } = await requireAppAccess("/account");
  const userCerts = await fetchCertificationsForUsers([data.currentUser.id]);
  const approvedCertCount = userCerts.filter((cert) => cert.status === "approved").length;
  const { milestones, trophies } = computeAccountBadges(data, approvedCertCount);
  const plan = data.plans.find((item) => item.userId === data.currentUser.id);

  return (
    <AppShell currentUser={data.currentUser} notifications={data.notifications}>
      <SEPageLayout
        eyebrow="Account"
        eyebrowColor="#cc27b0"
        subtitle="Profile, trophy case, career milestones, and sign-in security."
        title="Your account"
      >
        {source === "demo" ? (
          <p className="mb-4 text-sm text-[#cc27b0]">Demo data mode — connect Supabase for live profile sync.</p>
        ) : null}

        <AccountProfilePanel
          milestones={milestones}
          planProgress={plan?.progress ?? null}
          profile={data.currentUser}
          trophies={trophies}
        />

        <Card className="mt-6 border-[#e2eaf5] shadow-[0_1px_4px_rgba(0,20,58,0.04)]">
          <CardHeader>
            <CardTitle>Change password</CardTitle>
            <CardDescription>
              Verify your authenticator app, then set a new password. This extra step protects your account even if
              someone knows your current password.
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <ChangePasswordForm />
          </div>
        </Card>
      </SEPageLayout>
    </AppShell>
  );
}
