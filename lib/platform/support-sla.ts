import type { SupportPriority } from "@/lib/tenant/types";

const SLA_HOURS: Record<SupportPriority, number> = {
  critical: 1,
  high: 4,
  medium: 24,
  low: 72,
};

export function supportSlaDueAt(createdAt: string, priority: SupportPriority): Date {
  const due = new Date(createdAt);
  due.setHours(due.getHours() + SLA_HOURS[priority]);
  return due;
}

export function supportSlaStatus(
  createdAt: string,
  priority: SupportPriority,
  status: string,
  firstResponseAt: string | null,
): { dueAt: string; breached: boolean; label: string } {
  if (status === "resolved" || status === "closed") {
    return { dueAt: "", breached: false, label: "Closed" };
  }

  const due = supportSlaDueAt(createdAt, priority);
  const now = Date.now();
  const breached = now > due.getTime() && !firstResponseAt;
  const hoursLeft = Math.round((due.getTime() - now) / 3600000);

  if (breached) {
    return { dueAt: due.toISOString(), breached: true, label: `SLA breached ${Math.abs(hoursLeft)}h ago` };
  }
  if (hoursLeft <= 1) {
    return { dueAt: due.toISOString(), breached: false, label: "Due within 1h" };
  }
  return { dueAt: due.toISOString(), breached: false, label: `Due in ${hoursLeft}h` };
}
