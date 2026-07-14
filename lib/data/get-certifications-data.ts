import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export type CertificationRecord = {
  id: string;
  userId: string;
  certificationType: string;
  status: string;
  evidenceText: string | null;
  evidenceUrl: string | null;
  managerNotes: string | null;
  approvedAt: string | null;
};

export async function fetchCertificationsForUsers(
  userIds: string[],
  client?: SupabaseClient<Database>,
): Promise<CertificationRecord[]> {
  if (userIds.length === 0) return [];

  const supabase = client ?? (await createClient());
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("readiness_certifications")
    .select(
      "id, user_id, certification_type, status, evidence_text, evidence_url, manager_notes, approved_at",
    )
    .in("user_id", userIds)
    .order("certification_type");

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    userId: row.user_id,
    certificationType: row.certification_type,
    status: row.status,
    evidenceText: row.evidence_text,
    evidenceUrl: row.evidence_url,
    managerNotes: row.manager_notes,
    approvedAt: row.approved_at,
  }));
}
