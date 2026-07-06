import { AppShell } from "@/components/app-shell";
import { AccountProfilePanel } from "@/components/account/account-profile-panel";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { PageHeader } from "@/components/page-hero";
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
      <div className="space-y-8">
        <PageHeader
          description="Your profile, trophy case, career milestones, and sign-in security — MFA is required before password changes."
          eyebrow="Account"
          title="Your account"
          tone="magenta"
        />

        {source === "demo" ? (
          <p className="text-sm text-sp-magenta">Demo data mode — connect Supabase for live profile sync.</p>
        ) : null}

        <AccountProfilePanel
          milestones={milestones}
          planProgress={plan?.progress ?? null}
          profile={data.currentUser}
          trophies={trophies}
        />

        <Card>
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
      </div>
    </AppShell>
  );
}
