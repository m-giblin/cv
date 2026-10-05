import { AppShell } from "@/components/app-shell";
import { AccountProfilePanel } from "@/components/account/account-profile-panel";
import { PageHeader } from "@/components/ui/page-header";
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
      <PageHeader eyebrow="Profile, trophies and milestones" title="Your account" />
      <div className="px-[var(--gutter)] pb-8">
        {source === "demo" ? (
          <p className="mb-5 rounded-[10px] border-[1.5px] border-warning bg-warning-soft px-4 py-2.5 text-sm text-warning" role="status">
            <span aria-hidden>▲ </span>Demo data mode. Connect Supabase for live profile sync.
          </p>
        ) : null}

        <AccountProfilePanel
          manager={manager}
          milestones={milestones}
          planProgress={plan?.progress ?? null}
          profile={data.currentUser}
          trophies={trophies}
        />
      </div>
    </AppShell>
  );
}
