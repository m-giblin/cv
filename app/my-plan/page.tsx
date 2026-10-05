import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DataSourceBanner } from "@/components/data-source-banner";
import { MyRampList, RampHeader, RampStepDetail } from "@/components/my-plan/my-ramp";
import { RampRunway } from "@/components/se/ramp-runway";
import { SePlanCalendarView } from "@/components/se/se-plan-calendar-view";
import { requireAppAccess } from "@/lib/auth/require-access";
import { isFeatureEnabled } from "@/lib/platform/feature-flags";
import { loadPlatformSettings } from "@/lib/platform/settings";
import { fetchSePlanCalendarForUser } from "@/lib/se/fetch-se-plan-calendar";
import { buildRampModel } from "@/lib/se/ramp-model";

type MyPlanPageProps = {
  searchParams: Promise<{ view?: string; step?: string }>;
};

export default async function MyPlanPage({ searchParams }: MyPlanPageProps) {
  const { data, source } = await requireAppAccess("/my-plan");
  const params = await searchParams;
  const settings = await loadPlatformSettings(data.currentUser.tenantId ?? undefined);
  const calendarEnabled = isFeatureEnabled(settings.featureFlags, "plan-calendar");

  const plan = data.plans.find((item) => item.userId === data.currentUser.id);
  const mentor = plan?.mentorId ? data.profiles.find((profile) => profile.id === plan.mentorId) : undefined;
  const manager = data.profiles.find((profile) => profile.id === data.currentUser.managerId);
  const model = plan ? buildRampModel(plan) : null;

  // Step detail opens in place (replaces /plan-steps/[id]).
  if (params.step) {
    const step = plan?.steps.find((item) => item.assignmentStepId === params.step || item.id === params.step);
    if (!plan || !model || !step) notFound();
    return (
      <AppShell contentWidth="wide" currentUser={data.currentUser} notifications={data.notifications}>
        <RampStepDetail
          mentor={mentor}
          number={model.steps.findIndex((item) => item.id === step.id) + 1}
          plan={plan}
          step={step}
          total={model.total}
        />
      </AppShell>
    );
  }

  const view = params.view === "calendar" && calendarEnabled && plan ? "calendar" : "list";
  const calendar = view === "calendar" ? await fetchSePlanCalendarForUser(data.currentUser.id) : null;
  const next = model?.nextStep;
  const reviewer = next?.type === "mentor_review" && mentor ? mentor : manager;

  return (
    <AppShell contentWidth="wide" currentUser={data.currentUser} notifications={data.notifications}>
      <DataSourceBanner source={source} />
      <RampHeader calendarEnabled={calendarEnabled} plan={plan} view={view} />
      {model ? <RampRunway className="px-[var(--gutter)] pb-5" model={model} /> : null}

      {!plan || !model ? (
        <div className="mx-[var(--gutter)] mb-7 rounded-[14px] border-[1.5px] border-dashed border-line-strong p-7 text-[15px] text-muted">
          <p className="text-lg font-extrabold text-ink">No ramp plan yet</p>
          <p className="mt-1">
            {manager
              ? `${manager.fullName} will assign your ramp plan. You can reach them at ${manager.email}.`
              : "Your manager will assign a ramp plan when you join the program."}
          </p>
        </div>
      ) : view === "calendar" ? (
        <div className="px-[var(--gutter)] pb-7">
          <SePlanCalendarView initial={calendar ?? undefined} />
        </div>
      ) : (
        <MyRampList model={model} plan={plan} reviewerFirst={reviewer?.fullName.split(" ")[0] ?? null} />
      )}
    </AppShell>
  );
}
