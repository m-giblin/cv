import { DEMO_CALENDAR_WEEKS } from "@/components/se/plan-calendar/data";
import type { CalWeek } from "@/components/se/plan-calendar/types";
import { getDashboardData } from "@/lib/data/get-dashboard-data";
import { fetchPlansForUsers } from "@/lib/data/fetch-plans-bundle";
import { createClient } from "@/lib/supabase/server";
import { calendarMonthFromWeeks, userPlanToCalWeeks } from "@/lib/se/plan-calendar-mapper";
import type { UserPlan } from "@/lib/types";

export type SePlanCalendarPayload = {
  weeks: CalWeek[];
  year: number;
  month: number;
  monthLabel: string;
  source: "demo" | "plan";
};

function pickUserPlan(plans: UserPlan[], userId: string): UserPlan | null {
  return plans.find((plan) => plan.userId === userId) ?? null;
}

export async function fetchSePlanCalendarForUser(userId: string): Promise<SePlanCalendarPayload> {
  const { data, source } = await getDashboardData();
  let plan = pickUserPlan(data.plans, userId);

  if (source === "supabase") {
    const supabase = await createClient();
    if (supabase) {
      const scopedPlans = await fetchPlansForUsers(
        supabase,
        [userId],
        data.currentUser.tenantId ?? undefined,
      );
      plan = pickUserPlan(scopedPlans, userId) ?? plan;
    }
  }

  if (plan) {
    const weeks = userPlanToCalWeeks(plan);
    if (weeks.length > 0) {
      const monthMeta = calendarMonthFromWeeks(weeks);
      return { weeks, source: "plan", ...monthMeta };
    }
  }

  const monthMeta = calendarMonthFromWeeks(DEMO_CALENDAR_WEEKS);
  return { weeks: DEMO_CALENDAR_WEEKS, source: "demo", ...monthMeta };
}
