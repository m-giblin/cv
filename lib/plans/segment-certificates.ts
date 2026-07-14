import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { logAuditEvent } from "@/lib/audit/log-admin-action";
import { createNotification } from "@/lib/notifications/create-notification";

export async function issueSegmentCertificate(
  supabase: SupabaseClient<Database>,
  input: {
    assignmentId: string;
    userId: string;
    segmentIndex: number;
    programId?: string | null;
    validMonths?: number;
  },
) {
  const validMonths = input.validMonths ?? 12;
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + validMonths);

  const code = `ISC-S${input.segmentIndex}-${input.userId.slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`;

  const { data: existing } = await supabase
    .from("segment_certificates")
    .select("id, certificate_code")
    .eq("assignment_id", input.assignmentId)
    .eq("segment_index", input.segmentIndex)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase.from("segment_certificates").insert({
      assignment_id: input.assignmentId,
      user_id: input.userId,
      program_id: input.programId ?? null,
      segment_index: input.segmentIndex,
      certificate_code: code,
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  await createNotification(supabase, {
    userId: input.userId,
    title: `Segment ${input.segmentIndex} certificate earned`,
    body: `Certificate ${code} — valid until ${expiresAt.toLocaleDateString()}.`,
    actionUrl: "/my-plan",
  });

  return code;
}

export async function managerUnlockSegment(
  supabase: SupabaseClient<Database>,
  input: {
    assignmentId: string;
    unlockedSegmentMax: number;
    reason: string;
    managerId: string;
  },
) {
  const { data: assignment } = await supabase
    .from("plan_assignments")
    .select("id, user_id, unlocked_segment_max, tenant_id")
    .eq("id", input.assignmentId)
    .maybeSingle();

  if (!assignment) {
    throw new Error("Assignment not found.");
  }

  await supabase.from("segment_unlock_overrides").insert({
    assignment_id: input.assignmentId,
    unlocked_segment_max: input.unlockedSegmentMax,
    reason: input.reason,
    overridden_by: input.managerId,
  });

  await supabase
    .from("plan_assignments")
    .update({ unlocked_segment_max: input.unlockedSegmentMax })
    .eq("id", input.assignmentId);

  await logAuditEvent(input.managerId, {
    action: "segment.unlock_override",
    targetType: "plan_assignment",
    targetId: input.assignmentId,
    tenantId: (assignment as { tenant_id?: string | null }).tenant_id ?? null,
    details: {
      previous: assignment.unlocked_segment_max,
      next: input.unlockedSegmentMax,
      reason: input.reason,
    },
  });

  await createNotification(supabase, {
    userId: assignment.user_id,
    title: "Segment unlocked by manager",
    body: `Segment ${input.unlockedSegmentMax} is now available. Reason: ${input.reason}`,
    actionUrl: "/my-plan",
  });
}
