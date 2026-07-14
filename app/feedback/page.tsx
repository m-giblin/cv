import { AppShell } from "@/components/app-shell";
import { FeedbackInbox } from "@/components/feedback/feedback-inbox";
import { SEPageLayout } from "@/components/se/se-page-layout";
import { requireAppAccess } from "@/lib/auth/require-access";

export default async function FeedbackPage() {
 const { data } = await requireAppAccess("/feedback");

 return (
 <AppShell currentUser={data.currentUser} notifications={data.notifications}>
 <SEPageLayout
 eyebrow="Learning loop"
 eyebrowColor="#cc27b0"
 subtitle="All manager grades and comments on your challenges and simulation coaching cards"
 title="My Feedback"
 >
 <FeedbackInbox data={data} />
 </SEPageLayout>
 </AppShell>
 );
}
