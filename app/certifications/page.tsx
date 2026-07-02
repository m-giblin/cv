import { AppShell } from "@/components/app-shell";
import { CertificationGates } from "@/components/certifications/certification-gates";
import { DataSourceBanner } from "@/components/data-source-banner";
import { PageHeader } from "@/components/page-hero";
import { requireAppAccess } from "@/lib/auth/require-access";
import { getAccessTier } from "@/lib/auth/rbac";
import { fetchCertificationsForUsers } from "@/lib/data/get-certifications-data";
import { averageSimScore } from "@/lib/se/cert-next-action";
import type { SeLevel } from "@/lib/types";

type CertificationsPageProps = {
  searchParams: Promise<{ profile?: string }>;
};

export default async function CertificationsPage({ searchParams }: CertificationsPageProps) {
  const { data, source, tier } = await requireAppAccess("/certifications");
  const params = await searchParams;
  const isManagerView = tier !== "se";

  const teamProfiles = isManagerView
    ? tier === "admin"
      ? data.profiles
          .filter((profile) => getAccessTier(profile.role) === "se")
          .map((profile) => ({
            id: profile.id,
            fullName: profile.fullName,
            level: profile.level as SeLevel,
          }))
      : data.myOrg.map((profile) => ({
          id: profile.id,
          fullName: profile.fullName,
          level: profile.level as SeLevel,
        }))
    : [];

  const teamCerts =
    isManagerView && teamProfiles.length > 0
      ? await fetchCertificationsForUsers(teamProfiles.map((profile) => profile.id))
      : [];

  const profileParam = params.profile;
  const targetUserId =
    tier === "se"
      ? data.currentUser.id
      : profileParam && teamProfiles.some((profile) => profile.id === profileParam)
        ? profileParam
        : null;

  const targetProfile = targetUserId
    ? teamProfiles.find((profile) => profile.id === targetUserId)
    : null;

  const pendingCount = teamCerts.filter((cert) => cert.status === "submitted").length;

  const progressUserId = targetUserId ?? data.currentUser.id;
  const userPlan = data.plans.find((plan) => plan.userId === progressUserId);
  const userCoaching = data.coachingCards.filter((card) => card.userId === progressUserId);
  const planProgress = userPlan?.progress ?? 0;
  const avgSimScore = averageSimScore(userCoaching.map((card) => card.score));

  return (
    <AppShell currentUser={data.currentUser} notifications={data.notifications}>
      <div className="space-y-8">
        <DataSourceBanner source={source} />
        <PageHeader
          description={
            isManagerView && !targetUserId
              ? "Review team readiness — pending sign-offs first, then drill into any SE’s career gates."
              : "Field readiness gates — submit evidence, get manager sign-off, and track progress on the career ladder."
          }
          eyebrow="Readiness"
          title={
            targetProfile
              ? `${targetProfile.fullName} — certification gates`
              : isManagerView
                ? "Team certification readiness"
                : "Certification gates"
          }
          tone="magenta"
        />
        <CertificationGates
          avgSimScore={avgSimScore}
          initialTeamCerts={teamCerts}
          isManager={isManagerView}
          planProgress={planProgress}
          profileLevel={targetProfile?.level ?? (tier === "se" ? data.currentUser.level : undefined)}
          profileName={targetProfile?.fullName}
          teamProfiles={teamProfiles}
          userId={targetUserId ?? (tier === "se" ? data.currentUser.id : null)}
          viewerId={data.currentUser.id}
        />
        {isManagerView && !targetUserId && pendingCount > 0 ? (
          <p className="text-center text-xs text-sp-navy-muted">
            {pendingCount} pending sign-off{pendingCount === 1 ? "" : "s"} across your team
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}
