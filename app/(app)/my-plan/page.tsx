import { notFound } from "next/navigation";
import { DataSourceBanner } from "@/components/data-source-banner";
import { MyRampList, RampHeader, RampRunwayRow, RampStepDetail } from "@/components/my-plan/my-ramp";
import { SePlanCalendarView } from "@/components/se/se-plan-calendar-view";
import { PageBody } from "@/components/ui/page-header";
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
      <>
        <RampStepDetail
          mentor={mentor}
          number={model.steps.findIndex((item) => item.id === step.id) + 1}
          plan={plan}
          step={step}
          total={model.total}
        />
      </>
    );
  }

  const view = params.view === "calendar" && calendarEnabled && plan ? "calendar" : "list";
  const calendar = view === "calendar" ? await fetchSePlanCalendarForUser(data.currentUser.id) : null;
  const next = model?.nextStep;
  const reviewer = next?.type === "mentor_review" && mentor ? mentor : manager;

  return (
    <>
      <DataSourceBanner source={source} />
      <RampHeader calendarEnabled={calendarEnabled} model={model} plan={plan} view={view} />
      {model ? (
        <PageBody className="pb-[22px]">
          <RampRunwayRow model={model} />
        </PageBody>
      ) : null}

      {!plan || !model ? (
        <PageBody className="pb-7">
          <div className="rounded-[14px] border border-dashed border-line-strong p-7 text-[15px] text-muted">
            <h2 className="text-lg font-extrabold text-ink">No ramp plan yet</h2>
            <p className="mt-1">
              {manager
                ? `${manager.fullName} will assign your ramp plan. You can reach them at ${manager.email}.`
                : "Your manager will assign a ramp plan when you join the program."}
            </p>
          </div>
        </PageBody>
      ) : view === "calendar" ? (
        <PageBody className="pb-7">
          <SePlanCalendarView initial={calendar ?? undefined} />
        </PageBody>
      ) : (
        <MyRampList model={model} plan={plan} reviewer={reviewer} />
      )}
    </>
  );
}
