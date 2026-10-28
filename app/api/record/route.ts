import { NextResponse } from "next/server";
import { z } from "zod";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { resolveTenantContext } from "@/lib/auth/tenant-context";
import { loadAssignablePeople } from "@/lib/playbooks/assignment-access";
import { loadPersonRecord, type RecordViewer } from "@/lib/record/load-person-record";
import { isDateOnly, resolveRecordPeriod } from "@/lib/record/period";
import { localToday } from "@/lib/utils/date-only";

const querySchema = z.object({
  userId: z.string().uuid(),
  preset: z.enum(["month", "quarter", "year", "custom"]).default("month"),
  phase: z.enum(["onboarding", "ongoing", "all"]).default("all"),
  from: z.string().optional(),
  to: z.string().optional(),
  /** The viewer's calendar day and zone, so "this month" means their month. */
  today: z.string().optional(),
  tz: z.string().max(64).default("UTC"),
});

/**
 * GET ?userId=&preset=month|quarter|year|custom&from=&to=&phase=&today=&tz=
 * A person's Record for the period. People can read their own; managers read anyone in their line.
 */
export async function GET(request: Request) {
  const context = await resolveTenantContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const query = parsed.data;

  let tenantId: string | null;
  let viewer: RecordViewer;
  if (query.userId === context.userId) {
    tenantId = context.tenantId;
    viewer = "self";
  } else {
    const session = await requireManagerSession();
    if (session instanceof NextResponse) return session;
    const people = await loadAssignablePeople(session.tenantId, session.user.id, session.role);
    if (!people.some((person) => person.id === query.userId)) return NextResponse.json({ error: "Not found." }, { status: 404 });
    tenantId = session.tenantId;
    viewer = "manager";
  }
  if (!tenantId) return NextResponse.json({ error: "Not found." }, { status: 404 });

  if (query.preset === "custom" && !(isDateOnly(query.from) && isDateOnly(query.to))) {
    return NextResponse.json({ error: "Pick a start and end date." }, { status: 400 });
  }
  const today = isDateOnly(query.today) ? query.today : localToday();
  const period = resolveRecordPeriod(query.preset, today, { from: query.from, to: query.to });

  const record = await loadPersonRecord({
    tenantId,
    userId: query.userId,
    period,
    phase: query.phase,
    timeZone: query.tz,
    viewer,
    viewerId: context.userId,
  });
  if (!record) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ record });
}
