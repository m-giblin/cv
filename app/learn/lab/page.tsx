import { AppShell } from "@/components/app-shell";
import { IscLabChat } from "@/components/lab/isc-lab-chat";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { requireLabPageAccess } from "@/lib/auth/require-access";

export const metadata = { title: "ISC Lab · Learn" };

export default async function LabPage() {
  const { data } = await requireLabPageAccess();

  return (
    <AppShell contentWidth="wide" currentUser={data.currentUser} notifications={data.notifications}>
      <PageHeader
        accent="Ask, then check the source."
        actions={<StatusPill tone="blue">Answers cite their sources</StatusPill>}
        eyebrow="Learn"
        subtitle="An AI coach grounded in docs, battle cards and peer pitches."
        title="ISC Lab."
      />
      <PageBody className="pb-7">
        <IscLabChat />
      </PageBody>
    </AppShell>
  );
}
