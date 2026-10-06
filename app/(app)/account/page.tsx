import { AccountProfilePanel } from "@/components/account/account-profile-panel";
import { PageBody, PageHeader } from "@/components/ui/page-header";
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
    <>
      <PageHeader eyebrow="Profile, badges and milestones" title="Your account" />
      <PageBody className="pb-8">
        {source === "demo" ? (
          <p
            className="mb-5 max-w-[640px] rounded-[10px] border border-signal-edge/40 bg-signal-soft px-4 py-2.5 text-sm text-ink"
            role="status"
          >
            Demo data mode. Connect Supabase for live profile sync.
          </p>
        ) : null}

        <AccountProfilePanel
          manager={manager}
          milestones={milestones}
          planProgress={plan?.progress ?? null}
          profile={data.currentUser}
          trophies={trophies}
        />
      </PageBody>
    </>
  );
}
