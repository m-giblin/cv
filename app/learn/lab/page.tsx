import { AppShell } from "@/components/app-shell";
import { IscLabChat } from "@/components/lab/isc-lab-chat";
import { PageHeader } from "@/components/ui/page-header";
import { Tag } from "@/components/ui/tag";
import { requireLabPageAccess } from "@/lib/auth/require-access";

export const metadata = { title: "ISC Lab · Learn" };

export default async function LabPage() {
  const { data } = await requireLabPageAccess();

  return (
    <AppShell contentWidth="wide" currentUser={data.currentUser} notifications={data.notifications}>
      <PageHeader
        actions={<Tag tone="blue">● Cited sources</Tag>}
        eyebrow="AI coach · docs, battle cards and peer pitches"
        title="ISC Lab"
      />
      <div className="px-[var(--gutter)] pb-7">
        <IscLabChat />
      </div>
    </AppShell>
  );
}
