import { createAdminClient } from "@/lib/supabase/admin";
import { Json } from "@/lib/database.types";

export type AuditAction =
  | "user.created"
  | "user.updated"
  | "user.deleted"
  | "tenant.created"
  | "tenant.updated"
  | "tenant.feature_flags.updated"
  | "tenant.admin_invited"
  | "plan.template_created"
  | "plan.template_updated"
  | "plan.template_deleted"
  | "plan.assigned"
  | "plan.step_reviewed"
  | "segment.unlock_override"
  | "ai_settings.updated"
  | "platform_settings.updated"
  | "competency.created"
  | "competency.updated"
  | "competency.deleted"
  | "simulation_template.created"
  | "simulation_template.updated"
  | "simulation_template.deleted"
  | "content_asset.created"
  | "content_asset.updated"
  | "content_asset.deleted"
  | "corpus.routing_rule.created"
  | "corpus.routing_rule.deleted"
  | "corpus.feedback.moderated"
  | "certification.reviewed"
  | "submission.reviewed"
  | "coaching_card.reviewed"
  | "coaching_note.updated"
  | "development_plan.created"
  | "development_review.updated"
  | "challenge.saved"
  | "release.course.created"
  | "release.course.assigned"
  | "simulation.assigned"
  | "submission.created"
  | "deal_prep.session_created"
  | "deal_prep.session_updated"
  | "pitch.submitted"
  | "tenant.shadow_started"
  | "tenant.shadow_ended"
  | "tenant.status_updated"
  | "support.request_created"
  | "support.request_updated"

export async function logAuditEvent(
  actorId: string,
  params: {
    action: AuditAction;
    targetType: string;
    targetId?: string;
    details?: Record<string, unknown>;
    tenantId?: string | null;
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
    p_tenant_id: params.tenantId ?? undefined,
  });

  if (error) {
    console.error("Audit log failed:", error.message);
  }
}
