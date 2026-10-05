import { AppShell } from "@/components/app-shell";
import { CertificationGates } from "@/components/certifications/certification-gates";
import { requireAppAccess } from "@/lib/auth/require-access";
import { getAccessTier } from "@/lib/auth/rbac";
import { fetchCertificationsForUsers } from "@/lib/data/get-certifications-data";
import type { SeLevel } from "@/lib/types";

type CertificationPageProps = {
  searchParams: Promise<{ profile?: string }>;
};

export const metadata = { title: "Certification · Readiness" };

export default async function CertificationPage({ searchParams }: CertificationPageProps) {
  const { data, tier } = await requireAppAccess("/certifications");
  const params = await searchParams;
  const isManagerView = tier !== "se";

  const teamProfiles = isManagerView
    ? (tier === "admin"
        ? data.profiles.filter((profile) => getAccessTier(profile.role) === "se")
        : data.myOrg
      ).map((profile) => ({ id: profile.id, fullName: profile.fullName, level: profile.level as SeLevel }))
    : [];

  const teamCerts =
    isManagerView && teamProfiles.length > 0
      ? await fetchCertificationsForUsers(teamProfiles.map((profile) => profile.id))
      : [];

  const targetUserId =
    tier === "se"
      ? data.currentUser.id
      : params.profile && teamProfiles.some((profile) => profile.id === params.profile)
        ? params.profile
        : null;

  const targetProfile = targetUserId
    ? (data.profiles.find((profile) => profile.id === targetUserId) ??
      (targetUserId === data.currentUser.id ? data.currentUser : undefined))
    : undefined;
  const reviewer = targetProfile?.managerId
    ? data.profiles.find((profile) => profile.id === targetProfile.managerId)
    : undefined;

  return (
    <AppShell contentWidth="wide" currentUser={data.currentUser} notifications={data.notifications}>
      <CertificationGates
        challenges={data.challenges}
        coachingCards={targetUserId ? data.coachingCards.filter((card) => card.userId === targetUserId) : []}
        initialTeamCerts={teamCerts}
        isManager={isManagerView}
        profile={targetProfile}
        profileLevel={targetProfile?.level ?? (tier === "se" ? data.currentUser.level : undefined)}
        profileName={isManagerView ? targetProfile?.fullName : undefined}
        reviewerFirstName={reviewer?.fullName.split(" ")[0] ?? null}
        submissions={targetUserId ? data.submissions.filter((submission) => submission.userId === targetUserId) : []}
        teamProfiles={teamProfiles}
        userId={targetUserId}
        viewerId={data.currentUser.id}
      />
    </AppShell>
  );
}
