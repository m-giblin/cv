import { SupabaseClient } from "@supabase/supabase-js";
import { Database, Json } from "@/lib/database.types";

export type AuditAction =
  | "user.created"
  | "user.updated"
  | "user.deleted"
  | "plan.template_created"
  | "plan.template_updated"
  | "plan.template_deleted"
  | "plan.assigned";

export async function logAuditEvent(
  supabase: SupabaseClient<Database>,
  params: {
    action: AuditAction;
    targetType: string;
    targetId?: string;
    details?: Record<string, unknown>;
  },
) {
  const { error } = await supabase.rpc("insert_audit_log", {
    p_action: params.action,
    p_target_type: params.targetType,
    p_target_id: params.targetId ?? undefined,
    p_details: (params.details ?? {}) as Json,
  });

  if (error) {
    console.error("Audit log failed:", error.message);
  }
}
