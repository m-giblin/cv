import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create-notification";
import type { SupportRequest } from "@/lib/tenant/types";

export async function notifySuperAdminsOfNewTicket(ticket: SupportRequest): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  const { data: operators } = await admin.from("profiles").select("id").eq("role", "super_admin");
  for (const operator of operators ?? []) {
    await createNotification(admin, {
      userId: operator.id,
      title: `Support: ${ticket.subject}`,
      body: `${ticket.tenantName ?? "Tenant"} · ${ticket.priority} priority`,
      actionUrl: "/platform",
    });
  }
}

export async function notifyReporterOfTicketUpdate(
  ticket: SupportRequest,
  update: { status?: string; operatorReply?: string | null },
): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  if (update.operatorReply) {
    await createNotification(admin, {
      userId: ticket.reporterId,
      title: `Support update: ${ticket.subject}`,
      body: update.operatorReply.slice(0, 200),
      actionUrl: "/admin?tab=help",
    });
    return;
  }

  if (update.status && update.status !== "open") {
    await createNotification(admin, {
      userId: ticket.reporterId,
      title: `Support ticket ${update.status.replace("_", " ")}`,
      body: ticket.subject,
      actionUrl: "/admin?tab=help",
    });
  }
}
