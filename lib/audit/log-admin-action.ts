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
  | "pitch_scenario.created"
  | "pitch_scenario.updated"
  | "pitch_scenario.deactivated"
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
  | "tenant.commercial_updated"
  | "tenant.soft_deleted"
  | "tenant.admin_invite_revoked"
  | "tenant.admin_invite_resent"
  | "tenant.sso_updated"
  | "tenant.webhook_created"
  | "tenant.webhook_deleted"
  | "tenant.export_completed"
  | "tenant.export_failed"
  | "tenant.maintenance_updated"
  | "tenant.bulk_operation"
  | "operator.notification_prefs_updated"
  | "operator.impersonation_started"
  | "workspace.hat_switched"
  | "support.request_created"
  | "support.request_updated"
  | "audit.probe";

export type AuditWriteResult = {
  ok: boolean;
  id?: string;
  error?: string;
  via?: "rpc" | "direct";
};

export type AuditEventParams = {
  action: AuditAction;
  targetType: string;
  targetId?: string;
  details?: Record<string, unknown>;
  tenantId?: string | null;
};

/**
 * Persist an audit event. Tries the privileged RPC first, then a direct
 * service-role insert so a stale RPC overload cannot silently drop history.
 */
export async function logAuditEvent(
  actorId: string,
  params: AuditEventParams,
): Promise<AuditWriteResult> {
  const admin = createAdminClient();
  if (!admin) {
    const error = "Audit log skipped: service role client unavailable";
    console.error(error);
    return { ok: false, error };
  }

  const details = (params.details ?? {}) as Json;
  const payload = {
    p_action: params.action,
    p_target_type: params.targetType,
    p_target_id: params.targetId ?? undefined,
    p_details: details,
    p_actor_id: actorId,
    p_tenant_id: params.tenantId ?? undefined,
  };

  const { data: rpcId, error: rpcError } = await admin.rpc("insert_audit_log", payload);

  if (!rpcError) {
    return { ok: true, id: typeof rpcId === "string" ? rpcId : undefined, via: "rpc" };
  }

  console.error("Audit RPC failed, trying direct insert:", rpcError.message);

  const { data: row, error: insertError } = await admin
    .from("audit_logs")
    .insert({
      actor_id: actorId,
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId ?? null,
      details,
      tenant_id: params.tenantId ?? null,
    })
    .select("id")
    .single();

  if (insertError) {
    const error = `Audit log failed (rpc: ${rpcError.message}; direct: ${insertError.message})`;
    console.error(error);
    return { ok: false, error };
  }

  return { ok: true, id: row?.id, via: "direct" };
}

/** Platform ops: throw when audit cannot be written so failures are visible. */
export async function requireAuditEvent(actorId: string, params: AuditEventParams): Promise<void> {
  const result = await logAuditEvent(actorId, params);
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to write audit log.");
  }
}
