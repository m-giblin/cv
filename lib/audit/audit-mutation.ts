import { logAuditEvent } from "@/lib/audit/log-admin-action";

/** Fire-and-forget audit write for any authenticated mutation route. */
export function auditMutation(
  actorId: string,
  action: Parameters<typeof logAuditEvent>[1]["action"],
  targetType: string,
  targetId?: string,
  details?: Record<string, unknown>,
) {
  void logAuditEvent(actorId, { action, targetType, targetId, details });
}
