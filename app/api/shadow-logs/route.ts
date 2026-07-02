import { NextResponse } from "next/server";
import { z } from "zod";
import { completeAssignmentStep } from "@/lib/plans/complete-step";
import { createNotification } from "@/lib/notifications/create-notification";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  assignmentStepId: z.string().uuid().optional(),
  notes: z.string().min(10),
  customerName: z.string().optional(),
  meetingDate: z.string().optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { error } = await supabase.from("shadow_meeting_logs").insert({
    user_id: user.id,
    assignment_step_id: parsed.data.assignmentStepId ?? null,
    customer_name: parsed.data.customerName ?? null,
    notes: parsed.data.notes,
    meeting_date: parsed.data.meetingDate ?? new Date().toISOString().slice(0, 10),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (parsed.data.assignmentStepId) {
    await completeAssignmentStep(supabase, {
      assignmentStepId: parsed.data.assignmentStepId,
      userId: user.id,
      notes: parsed.data.notes.slice(0, 200),
    });
  }

  const { data: profile } = await supabase.from("profiles").select("manager_id").eq("id", user.id).maybeSingle();

  if (profile?.manager_id) {
    await createNotification(supabase, {
      userId: profile.manager_id,
      title: "Shadow meeting logged",
      body: "An SE submitted a shadow session log for your review.",
      actionUrl: "/manager",
    });
  }

  return NextResponse.json({ success: true });
}
