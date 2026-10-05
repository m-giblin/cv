import { AppShell } from "@/components/app-shell";
import { FeedbackInbox } from "@/components/feedback/feedback-inbox";
import { PageHeader } from "@/components/ui/page-header";
import { requireAppAccess } from "@/lib/auth/require-access";

export const metadata = { title: "Feedback · Readiness" };

export default async function FeedbackPage() {
  const { data } = await requireAppAccess("/feedback");

  return (
    <AppShell contentWidth="wide" currentUser={data.currentUser} notifications={data.notifications}>
      <PageHeader eyebrow="Manager grades and comments on your sims and challenges" title="Feedback" />
      <div className="px-[var(--gutter)] pb-7">
        <FeedbackInbox data={data} />
      </div>
    </AppShell>
  );
}
