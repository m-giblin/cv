import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import { createNotification } from "@/lib/notifications/create-notification";
import { loadAssignments, todayIso } from "@/lib/playbooks/assignments";

const DUE_SOON_DAYS = 2;

/**
 * Daily: nudge people whose playbook is due within two days, and tell both the person and whoever
 * assigned it once it's overdue. Each reminder is sent once per due date; finished work is skipped.
 */
export async function sendPlaybookAssignmentReminders(): Promise<{ dueSoon: number; overdue: number }> {
  const admin = getTenantAdminClient();
  if (!admin) return { dueSoon: 0, overdue: 0 };

  const horizon = todayIso(new Date(Date.now() + DUE_SOON_DAYS * 86_400_000));
  const { data } = await admin
    .from("playbook_assignments")
    .select("tenant_id, assigned_to")
    .eq("status", "active")
    .lte("due_date", horizon);
  const rows = (data ?? []) as { tenant_id: string; assigned_to: string }[];

  const byTenant = new Map<string, Set<string>>();
  for (const row of rows) byTenant.set(row.tenant_id, (byTenant.get(row.tenant_id) ?? new Set()).add(row.assigned_to));

  const { data: sentRows } = await admin
    .from("playbook_assignments")
    .select("id, due_soon_reminded_at, overdue_reminded_at")
    .eq("status", "active")
    .lte("due_date", horizon);
  const sent = new Map(
    ((sentRows ?? []) as { id: string; due_soon_reminded_at: string | null; overdue_reminded_at: string | null }[]).map((row) => [row.id, row]),
  );

  const notify = (userId: string, title: string, body: string) =>
    createNotification(admin as unknown as SupabaseClient<Database>, { userId, title, body, actionUrl: "/learn/playbooks" }).catch(() => undefined);

  let dueSoon = 0;
  let overdue = 0;
  for (const [tenantId, people] of byTenant) {
    // Loading also marks finished assignments completed, so they're skipped below.
    const assignments = await loadAssignments(tenantId, { assigneeIds: [...people] });
    for (const assignment of assignments) {
      if (assignment.status !== "active" || assignment.progress.state === "done") continue;
      const flags = sent.get(assignment.id);
      const remaining = assignment.progress.parts.filter((part) => !part.done).map((part) => part.label.toLowerCase());
      if (assignment.progress.daysLeft < 0 && !flags?.overdue_reminded_at) {
        await notify(
          assignment.assignedTo,
          `Overdue: ${assignment.playbookTitle}`,
          `This playbook was due ${assignment.dueDate}. Still to do: ${remaining.join(", ")}.`,
        );
        if (assignment.assignedBy) {
          await notify(
            assignment.assignedBy,
            `${assignment.assigneeName} is overdue on a playbook`,
            `${assignment.playbookTitle} was due ${assignment.dueDate}. Still to do: ${remaining.join(", ")}.`,
          );
        }
        await admin.from("playbook_assignments").update({ overdue_reminded_at: new Date().toISOString() }).eq("id", assignment.id);
        overdue += 1;
      } else if (assignment.progress.daysLeft >= 0 && assignment.progress.daysLeft <= DUE_SOON_DAYS && !flags?.due_soon_reminded_at) {
        const when = assignment.progress.daysLeft === 0 ? "today" : assignment.progress.daysLeft === 1 ? "tomorrow" : `on ${assignment.dueDate}`;
        await notify(
          assignment.assignedTo,
          `Due ${when}: ${assignment.playbookTitle}`,
          `Still to do: ${remaining.join(", ")}.`,
        );
        await admin.from("playbook_assignments").update({ due_soon_reminded_at: new Date().toISOString() }).eq("id", assignment.id);
        dueSoon += 1;
      }
    }
  }
  return { dueSoon, overdue };
}
