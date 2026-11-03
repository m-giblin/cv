import { NextResponse } from "next/server";
import { getAccessTier } from "@/lib/auth/rbac";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { loadAssignablePeople } from "@/lib/playbooks/assignment-access";
import { loadWeeklyMixForPeople } from "@/lib/question-bank/data";

export type WeeklyQuizRow = { id: string; name: string; status: "passed" | "below" | "not_taken"; best: number | null; taken: number };

/** This week's quiz for each learner the manager looks after (their whole line; admins see everyone). */
export async function GET() {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) return session;
  const people = (await loadAssignablePeople(session.tenantId, session.user.id, session.role)).filter(
    (person) => getAccessTier(person.role) === "se",
  );
  const weekly = await loadWeeklyMixForPeople(
    session.tenantId,
    people.map((person) => person.id),
  );
  const rows: WeeklyQuizRow[] = people.map((person) => {
    const mix = weekly[person.id];
    return {
      id: person.id,
      name: person.name,
      status: !mix ? "not_taken" : mix.passed ? "passed" : "below",
      best: mix?.best ?? null,
      taken: mix?.taken ?? 0,
    };
  });
  return NextResponse.json({ rows });
}
