import { AppShell } from "@/components/app-shell";
import { AccountProfilePanel } from "@/components/account/account-profile-panel";
import { SEPageLayout } from "@/components/se/se-page-layout";
import { computeAccountBadges } from "@/lib/account/achievements";
import { requireAppAccess } from "@/lib/auth/require-access";
import { fetchCertificationsForUsers } from "@/lib/data/get-certifications-data";

export default async function AccountPage() {
  const { data, source } = await requireAppAccess("/account");
  const userCerts = await fetchCertificationsForUsers([data.currentUser.id]);
  const approvedCertCount = userCerts.filter((cert) => cert.status === "approved").length;
  const { milestones, trophies } = computeAccountBadges(data, approvedCertCount);
  const plan = data.plans.find((item) => item.userId === data.currentUser.id);
  const manager = data.profiles.find((profile) => profile.id === data.currentUser.managerId);

  return (
    <AppShell currentUser={data.currentUser} notifications={data.notifications}>
      <SEPageLayout
        eyebrow="Account"
        eyebrowColor="#cc27b0"
        subtitle="Profile, trophy case, and career milestones."
        title="Your account"
      >
        {source === "demo" ? (
          <p className="mb-4 text-sm text-[#cc27b0]">Demo data mode — connect Supabase for live profile sync.</p>
        ) : null}

        <AccountProfilePanel
          manager={manager}
          milestones={milestones}
          planProgress={plan?.progress ?? null}
          profile={data.currentUser}
          trophies={trophies}
        />
      </SEPageLayout>
    </AppShell>
  );
}
