import { NextResponse } from "next/server";
import { canReviewUserWork } from "@/lib/auth/can-review";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { fetchDevelopmentPlans } from "@/lib/data/get-development-data";
import { fetchManagerCoachingNotes } from "@/lib/data/get-manager-growth-data";
import { fetchMentorCoachingNotesForManager } from "@/lib/data/fetch-mentor-mentees";

/**
 * The parts of an SE's detail workbench that manager pages no longer preload: their development
 * plan and the coaching notes. Fetched when the manager opens that SE.
 */
export async function GET(request: Request) {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) return session;

  const profileId = new URL(request.url).searchParams.get("profile");
  if (!profileId) {
    return NextResponse.json({ error: "profile is required" }, { status: 400 });
  }
  if (!(await canReviewUserWork(profileId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [developmentPlans, managerNotes, mentorNotes] = await Promise.all([
    fetchDevelopmentPlans([profileId], session.supabase),
    fetchManagerCoachingNotes(session.user.id, [profileId], session.supabase),
    fetchMentorCoachingNotesForManager(session.supabase, [profileId]),
  ]);

  return NextResponse.json({
    developmentPlan: developmentPlans.find((plan) => plan.userId === profileId) ?? null,
    managerNotes: managerNotes[profileId] ?? "",
    mentorNotes: mentorNotes[profileId] ?? null,
  });
}
