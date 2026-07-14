import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DataSourceBanner } from "@/components/data-source-banner";
import { MyRampPlanNorthstar } from "@/components/my-plan/my-ramp-plan-northstar";
import { SEPageLayout } from "@/components/se/se-page-layout";
import { requireAppAccess } from "@/lib/auth/require-access";
import { buildSegmentProgress } from "@/lib/plans/segment-progress";
import { loadUnifiedProgramForUser } from "@/lib/plans/unified-program";
import { createClient } from "@/lib/supabase/server";

export default async function MyPlanPage() {
 const { data, source } = await requireAppAccess("/my-plan");
 const supabase = await createClient();
 const unifiedProgram =
 supabase && data.currentUser.id
 ? await loadUnifiedProgramForUser(supabase, data.currentUser.id)
 : null;
 const plan = data.plans.find((item) => item.userId === data.currentUser.id);
 const mentor = plan?.mentorId
 ? data.profiles.find((profile) => profile.id === plan.mentorId)
 : undefined;
 const manager = data.profiles.find((profile) => profile.id === data.currentUser.managerId);
 const segments = plan ? buildSegmentProgress(plan) : [];

 return (
 <AppShell currentUser={data.currentUser} notifications={data.notifications}>
 <SEPageLayout
 eyebrow="Onboarding"
 subtitle="Every step, status, and due date in one place"
 title="My Ramp Plan"
 >
 <DataSourceBanner source={source} />

 {!plan ? (
 <div className="border border-[#E2DFD9] bg-white p-6">
 <div className="space-y-1.5">
 <h2 className="text-lg font-semibold text-[#0D0E12]">No ramp plan yet</h2>
 <p className="text-sm text-[#6B6860]">
 {manager
 ? `Your manager ${manager.fullName} will assign your ramp plan. You can reach them at ${manager.email}.`
 : "Your manager will assign a ramp plan when you join the program."}
 </p>
 </div>
 <div className="mt-4">
 <Link className="text-sm font-semibold text-[#0071ce]" href="/dashboard">
 Back to workspace →
 </Link>
 </div>
 </div>
 ) : (
 <MyRampPlanNorthstar
 manager={manager}
 mentor={mentor}
 plan={plan}
 segments={segments}
 unifiedProgram={unifiedProgram}
 />
 )}

 <p className="text-sm text-[#6B6860]">
 Track long-term growth on{" "}
 <Link className="font-semibold text-[#0071ce]" href="/growth-plan">
 My Growth Plan
 </Link>{" "}
 · career ladder on{" "}
 <Link className="font-semibold text-[#0071ce]" href="/growth">
 Growth
 </Link>
 .
 </p>
 </SEPageLayout>
 </AppShell>
 );
}
