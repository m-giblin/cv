import type { SupabaseClient } from "@supabase/supabase-js";
import { FeedbackInbox } from "@/components/feedback/feedback-inbox";
import { ReadinessTabs } from "@/components/growth/readiness-tabs";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { requireAppAccess } from "@/lib/auth/require-access";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import type { Database } from "@/lib/database.types";
import { loadMentorStepReviews } from "@/lib/mentoring/mentor-step-reviews";
import { feedbackItemCount } from "@/lib/se/readiness-tabs";

export const metadata = { title: "Feedback · Readiness" };

export default async function FeedbackPage() {
  const { data } = await requireAppAccess("/feedback");
  // The mentor reviews ramp steps; their name is often outside the SE's visible profiles.
  const admin = getTenantAdminClient() as unknown as SupabaseClient<Database> | null;
  const mentorReviews = admin
    ? await loadMentorStepReviews(admin, data.plans, data.currentUser.id).catch(() => null)
    : null;

  return (
    <>
      <PageHeader accent="What your reviewers said." eyebrow="Readiness" title="Feedback." />
      <PageBody className="flex flex-col gap-[22px] pb-7">
        <ReadinessTabs feedbackCount={feedbackItemCount(data, mentorReviews?.items.length)} value="feedback" />
        <FeedbackInbox data={data} mentorReviews={mentorReviews} />
      </PageBody>
    </>
  );
}
