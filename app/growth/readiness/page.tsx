import { AppShell } from "@/components/app-shell";
import { MyReadinessCard } from "@/components/growth/my-readiness-card";
import { SEPageLayout } from "@/components/se/se-page-layout";
import { requireAppAccess } from "@/lib/auth/require-access";

export default async function MyReadinessPage() {
  const { data } = await requireAppAccess("/growth/readiness");

  return (
    <AppShell currentUser={data.currentUser} notifications={data.notifications}>
      <SEPageLayout
        eyebrow="Career"
        subtitle="Your composite readiness and competency picture across every practice feature"
        title="My Readiness"
      >
        <MyReadinessCard />
      </SEPageLayout>
    </AppShell>
  );
}
