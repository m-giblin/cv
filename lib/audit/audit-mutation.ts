import { logAuditEvent, type AuditAction, type AuditEventParams } from "@/lib/audit/log-admin-action";

/** Fire-and-forget audit write for tenant-admin / SE mutation routes. */
export function auditMutation(
  actorId: string,
  action: AuditAction,
  targetType: string,
  targetId?: string,
  details?: Record<string, unknown>,
  tenantId?: string | null,
) {
  const params: AuditEventParams = { action, targetType, targetId, details, tenantId };
  void logAuditEvent(actorId, params).then((result) => {
    if (!result.ok) {
      console.error("auditMutation failed:", result.error);
    }
  });
}
