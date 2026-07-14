import { AppShell } from "@/components/app-shell";
import { DataSourceBanner } from "@/components/data-source-banner";
import { MyPracticeHub } from "@/components/practice/my-practice-hub";
import { requireMyPracticePageAccess } from "@/lib/auth/require-access";

export default async function MyPracticePage() {
  const { data, source } = await requireMyPracticePageAccess();

  return (
    <AppShell currentUser={data.currentUser} notifications={data.notifications}>
      <DataSourceBanner source={source} />
      <MyPracticeHub
        coachingCards={data.coachingCards}
        submissions={data.submissions}
        user={data.currentUser}
      />
    </AppShell>
  );
}
