import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireManagerSession } from "@/lib/auth/require-manager";
import type { Database } from "@/lib/database.types";
import { ONE_ON_ONE_EVENT, loadUpcomingOneOnOnes, oneOnOneClash } from "@/lib/manager/one-on-ones";
import { createNotification } from "@/lib/notifications/create-notification";
import { createAdminClient } from "@/lib/supabase/admin";

const ADMIN_ROLES = ["director", "admin", "super_admin"];

const postSchema = z.object({
  userId: z.string().uuid(),
  start: z.string().datetime({ offset: true }),
  minutes: z.number().int().min(15).max(120),
  label: z.string().trim().min(3).max(80),
  inviteMentor: z.boolean(),
  /** Set after the scheduler has seen the clash warning and chosen to keep the time. */
  allowClash: z.boolean().optional(),
});

type Person = { id: string; full_name: string; manager_id: string | null; tenant_id: string | null };

/**
 * The signed-in manager may schedule with this person when they manage them, assigned their program,
 * or are an admin in the same workspace.
 */
async function personYouManage(admin: SupabaseClient<Database>, viewerId: string, role: string, tenantId: string, userId: string) {
  const { data } = await admin.from("profiles").select("id, full_name, manager_id, tenant_id").eq("id", userId).maybeSingle();
  const person = data as Person | null;
  if (!person) return null;
  if (person.manager_id === viewerId) return person;
  if (ADMIN_ROLES.includes(role) && person.tenant_id === tenantId) return person;
  const { count } = await admin
    .from("plan_assignments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("assigned_by", viewerId);
  return count ? person : null;
}

export async function GET(request: Request) {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) return session;
  const admin = createAdminClient() as SupabaseClient<Database> | null;
  if (!admin) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });

  const userId = new URL(request.url).searchParams.get("userId") ?? "";
  if (!z.string().uuid().safeParse(userId).success) return NextResponse.json({ error: "userId required" }, { status: 400 });
  if (!(await personYouManage(admin, session.user.id, session.role, session.tenantId, userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ upcoming: await loadUpcomingOneOnOnes(admin, userId) });
}

/** Records a scheduled 1:1 so it shows on the person's profile and Today page, and tells them (and the mentor). */
export async function POST(request: Request) {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) return session;
  const admin = createAdminClient() as SupabaseClient<Database> | null;
  if (!admin) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });

  const parsed = postSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Pick a date, time and length." }, { status: 400 });
  const { userId, start, minutes, label, inviteMentor, allowClash } = parsed.data;
  if (new Date(start).getTime() < Date.now() - 5 * 60_000) {
    return NextResponse.json({ error: "Pick a time that hasn't passed." }, { status: 400 });
  }

  const person = await personYouManage(admin, session.user.id, session.role, session.tenantId, userId);
  if (!person) return NextResponse.json({ error: "You can only schedule 1:1s with people you manage." }, { status: 403 });

  const [{ data: me }, { data: assignment }] = await Promise.all([
    admin.from("profiles").select("full_name").eq("id", session.user.id).maybeSingle(),
    admin
      .from("plan_assignments")
      .select("mentor_id")
      .eq("user_id", userId)
      .neq("status", "completed")
      .not("mentor_id", "is", null)
      .limit(1)
      .maybeSingle(),
  ]);
  const managerName = me?.full_name ?? "Your manager";
  const mentorId = inviteMentor ? (assignment?.mentor_id ?? null) : null;

  if (!allowClash) {
    const { data: mentor } = mentorId
      ? await admin.from("profiles").select("full_name").eq("id", mentorId).maybeSingle()
      : { data: null };
    const clash = await oneOnOneClash(admin, {
      schedulerId: session.user.id,
      mentorId,
      mentorName: mentor?.full_name ?? null,
      userId,
      start,
      minutes,
    });
    if (clash) return NextResponse.json({ clash }, { status: 409 });
  }

  const { data: row, error } = await admin
    .from("activity_logs")
    .insert({
      user_id: userId,
      actor_id: session.user.id,
      event_type: ONE_ON_ONE_EVENT,
      title: `1:1 with ${managerName} on ${label}`,
      metadata: { start, minutes, label, mentor_invited: Boolean(mentorId), mentor_id: mentorId, scheduled_by_name: managerName },
      tenant_id: person.tenant_id ?? session.tenantId,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: "Couldn't save the 1:1. Try again." }, { status: 500 });

  const firstName = person.full_name.split(" ")[0] ?? person.full_name;
  await Promise.all([
    createNotification(admin, {
      userId,
      title: `1:1 with ${managerName}: ${label}`,
      body: `${minutes} minutes${mentorId ? ", your mentor is invited too" : ""}. It's on your Today page.`,
      actionUrl: "/dashboard",
    }),
    mentorId && mentorId !== session.user.id
      ? createNotification(admin, {
          userId: mentorId,
          title: `You're invited to ${firstName}'s 1:1: ${label}`,
          body: `${managerName} scheduled ${minutes} minutes with ${person.full_name} and asked you to join.`,
          actionUrl: "/mentoring",
        })
      : Promise.resolve(),
  ]);

  return NextResponse.json({ id: row.id });
}
