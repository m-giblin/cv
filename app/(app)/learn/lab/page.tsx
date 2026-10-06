import { IscLabChat } from "@/components/lab/isc-lab-chat";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { requirePathAccess } from "@/lib/auth/require-access";

export const metadata = { title: "ISC Lab · Learn" };

export default async function LabPage() {
  await requirePathAccess("/lab");

  return (
    <>
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
    </>
  );
}
