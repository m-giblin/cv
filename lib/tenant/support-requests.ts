import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/database.types";
import type { SupportPriority, SupportRequest, SupportStatus } from "@/lib/tenant/types";

export type { SupportPriority, SupportRequest, SupportStatus };

type DbRow = {
  id: string;
  tenant_id: string;
  reporter_id: string;
  subject: string;
  body: string;
  priority: SupportPriority;
  status: SupportStatus;
  page_url: string | null;
  operator_notes: string | null;
  operator_reply: string | null;
  assigned_to: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(
  row: DbRow,
  extras?: {
    tenantName?: string;
    reporterName?: string | null;
    reporterEmail?: string | null;
    assignedToName?: string | null;
  },
): SupportRequest {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    tenantName: extras?.tenantName,
    reporterId: row.reporter_id,
    reporterName: extras?.reporterName,
    reporterEmail: extras?.reporterEmail,
    subject: row.subject,
    body: row.body,
    priority: row.priority,
    status: row.status,
    pageUrl: row.page_url,
    operatorNotes: row.operator_notes,
    operatorReply: row.operator_reply,
    assignedTo: row.assigned_to,
    assignedToName: extras?.assignedToName,
    firstResponseAt: row.first_response_at,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createSupportRequest(input: {
  tenantId: string;
  reporterId: string;
  subject: string;
  body: string;
  priority: SupportPriority;
  pageUrl?: string | null;
}): Promise<SupportRequest> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Service unavailable");

  const { data, error } = await admin
    .from("support_requests")
    .insert({
      tenant_id: input.tenantId,
      reporter_id: input.reporterId,
      subject: input.subject.trim(),
      body: input.body.trim(),
      priority: input.priority,
      page_url: input.pageUrl ?? null,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create support request");
  return mapRow(data as DbRow);
}

export async function listSupportRequests(options?: {
  tenantId?: string;
  status?: SupportStatus | "active";
  assignedTo?: string | null;
  limit?: number;
}): Promise<SupportRequest[]> {
  const admin = createAdminClient();
  if (!admin) return [];

  const limit = options?.limit ?? 100;
  let query = admin.from("support_requests").select("*").order("created_at", { ascending: false }).limit(limit);

  if (options?.tenantId) {
    query = query.eq("tenant_id", options.tenantId);
  }
  if (options?.assignedTo) {
    query = query.eq("assigned_to", options.assignedTo);
  }
  if (options?.status === "active") {
    query = query.in("status", ["open", "in_progress"]);
  } else if (options?.status) {
    query = query.eq("status", options.status);
  }

  const { data: rows } = await query;
  if (!rows?.length) return [];

  const tenantIds = [...new Set(rows.map((row) => row.tenant_id))];
  const profileIds = [
    ...new Set(
      rows.flatMap((row) => [row.reporter_id, row.assigned_to].filter(Boolean)),
    ),
  ] as string[];

  const [{ data: tenants }, { data: profiles }] = await Promise.all([
    admin.from("tenants").select("id, name").in("id", tenantIds),
    profileIds.length
      ? admin.from("profiles").select("id, full_name, email").in("id", profileIds)
      : Promise.resolve({ data: [] }),
  ]);

  const tenantNames = new Map((tenants ?? []).map((t) => [t.id, t.name]));
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return (rows as DbRow[]).map((row) => {
    const reporter = profileMap.get(row.reporter_id);
    const assignee = row.assigned_to ? profileMap.get(row.assigned_to) : undefined;
    return mapRow(row, {
      tenantName: tenantNames.get(row.tenant_id),
      reporterName: reporter?.full_name ?? null,
      reporterEmail: reporter?.email ?? null,
      assignedToName: assignee?.full_name ?? null,
    });
  });
}

export async function getSupportRequestById(id: string): Promise<SupportRequest | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("support_requests").select("*").eq("id", id).maybeSingle();
  if (!data) return null;

  const row = data as DbRow;
  const [{ data: tenant }, { data: reporter }, { data: assignee }] = await Promise.all([
    admin.from("tenants").select("name").eq("id", row.tenant_id).maybeSingle(),
    admin.from("profiles").select("full_name, email").eq("id", row.reporter_id).maybeSingle(),
    row.assigned_to
      ? admin.from("profiles").select("full_name").eq("id", row.assigned_to).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return mapRow(row, {
    tenantName: tenant?.name,
    reporterName: reporter?.full_name ?? null,
    reporterEmail: reporter?.email ?? null,
    assignedToName: assignee?.full_name ?? null,
  });
}

export async function updateSupportRequest(
  id: string,
  input: {
    status?: SupportStatus;
    operatorNotes?: string | null;
    operatorReply?: string | null;
    assignedTo?: string | null;
    resolvedBy?: string | null;
    setFirstResponse?: boolean;
  },
): Promise<SupportRequest> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Service unavailable");

  const existing = await admin.from("support_requests").select("first_response_at").eq("id", id).maybeSingle();

  const payload: Database["public"]["Tables"]["support_requests"]["Update"] = {
    updated_at: new Date().toISOString(),
  };
  if (input.status) {
    payload.status = input.status;
    if (input.status === "resolved" || input.status === "closed") {
      payload.resolved_at = new Date().toISOString();
      payload.resolved_by = input.resolvedBy ?? null;
    }
  }
  if (input.operatorNotes !== undefined) {
    payload.operator_notes = input.operatorNotes;
  }
  if (input.operatorReply !== undefined) {
    payload.operator_reply = input.operatorReply;
  }
  if (input.assignedTo !== undefined) {
    payload.assigned_to = input.assignedTo;
  }
  if (
    (input.setFirstResponse || input.operatorReply || input.status === "in_progress") &&
    !existing.data?.first_response_at
  ) {
    payload.first_response_at = new Date().toISOString();
  }

  const { data, error } = await admin.from("support_requests").update(payload).eq("id", id).select("*").single();
  if (error || !data) throw new Error(error?.message ?? "Failed to update support request");

  const full = await getSupportRequestById(id);
  return full ?? mapRow(data as DbRow);
}
