import { createAdminClient } from "@/lib/supabase/admin";
import { Json } from "@/lib/database.types";

export type AuditAction =
  | "user.created"
  | "user.updated"
  | "user.deleted"
  | "plan.template_created"
  | "plan.template_updated"
  | "plan.template_deleted"
  | "plan.assigned"
  | "segment.unlock_override"
  | "ai_settings.updated"
  | "platform_settings.updated";

export async function logAuditEvent(
  actorId: string,
  params: {
    action: AuditAction;
    targetType: string;
    targetId?: string;
    details?: Record<string, unknown>;
  },
) {
  const admin = createAdminClient();
  if (!admin) {
    console.error("Audit log skipped: service role client unavailable");
    return;
  }

  const { error } = await admin.rpc("insert_audit_log", {
    p_action: params.action,
    p_target_type: params.targetType,
    p_target_id: params.targetId ?? undefined,
    p_details: (params.details ?? {}) as Json,
    p_actor_id: actorId,
  });

  if (error) {
    console.error("Audit log failed:", error.message);
  }
}
