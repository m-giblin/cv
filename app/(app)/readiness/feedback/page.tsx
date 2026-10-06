import { FeedbackInbox } from "@/components/feedback/feedback-inbox";
import { ReadinessTabs } from "@/components/growth/readiness-tabs";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { requireAppAccess } from "@/lib/auth/require-access";
import { feedbackItemCount } from "@/lib/se/readiness-tabs";

export const metadata = { title: "Feedback · Readiness" };

export default async function FeedbackPage() {
  const { data } = await requireAppAccess("/feedback");

  return (
    <>
      <PageHeader accent="What your reviewers said." eyebrow="Readiness" title="Feedback." />
      <PageBody className="flex flex-col gap-[22px] pb-7">
        <ReadinessTabs feedbackCount={feedbackItemCount(data)} value="feedback" />
        <FeedbackInbox data={data} />
      </PageBody>
    </>
  );
}
