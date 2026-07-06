import { NextResponse } from "next/server";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { getActiveAssignmentUserIdsForPlan } from "@/lib/plans/active-assignment";

export async function GET() {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) return session;

  const { data: courses } = await session.supabase
    .from("release_courses")
    .select("id, name, project_tag, plan_id")
    .order("created_at", { ascending: false });

  const launches = await Promise.all(
    (courses ?? []).map(async (course) => {
      if (!course.plan_id) {
        return { ...course, enrolled: 0, started: 0, completed: 0 };
      }

      const enrolled = await getActiveAssignmentUserIdsForPlan(session.supabase, course.plan_id);
      const userIds = [...enrolled];

      if (userIds.length === 0) {
        return { id: course.id, name: course.name, project_tag: course.project_tag, enrolled: 0, started: 0, completed: 0 };
      }

      const { data: assignments } = await session.supabase
        .from("plan_assignments")
        .select("id, status, progress_percent")
        .eq("plan_id", course.plan_id)
        .in("user_id", userIds);

      const started = (assignments ?? []).filter((a) => Number(a.progress_percent) > 0).length;
      const completed = (assignments ?? []).filter((a) => a.status === "completed").length;

      return {
        id: course.id,
        name: course.name,
        project_tag: course.project_tag,
        enrolled: userIds.length,
        started,
        completed,
      };
    }),
  );

  return NextResponse.json({ launches });
}
