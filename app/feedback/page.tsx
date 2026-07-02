import { AppShell } from "@/components/app-shell";
import { FeedbackInbox } from "@/components/feedback/feedback-inbox";
import { PageHeader } from "@/components/page-hero";
import { requireAppAccess } from "@/lib/auth/require-access";

export default async function FeedbackPage() {
  const { data } = await requireAppAccess("/feedback");

  return (
    <AppShell currentUser={data.currentUser} notifications={data.notifications}>
      <div className="mx-auto max-w-3xl space-y-8">
        <PageHeader
          description="All manager grades and comments on your challenges and simulation coaching cards."
          eyebrow="Learning loop"
          title="My feedback"
          tone="magenta"
        />
        <FeedbackInbox data={data} />
      </div>
    </AppShell>
  );
}
