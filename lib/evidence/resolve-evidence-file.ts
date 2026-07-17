import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  evidenceKindFromName,
  resolveEvidenceStoragePath,
  type EvidenceKind,
} from "@/lib/evidence/evidence-file-shared";
import { createAdminClient } from "@/lib/supabase/admin";

export type ResolvedEvidence = {
  label: string;
  href: string | null;
  kind: EvidenceKind;
  storagePath: string | null;
  unavailable: boolean;
};

export {
  evidenceKindFromName,
  resolveEvidenceStoragePath,
  isPdfEvidence,
} from "@/lib/evidence/evidence-file-shared";

export async function signEvidenceStoragePath(
  supabase: SupabaseClient,
  storagePath: string,
): Promise<string | null> {
  const { data, error } = await supabase.storage.from("evidence").createSignedUrl(storagePath, 3600);
  if (!error && data?.signedUrl) {
    return data.signedUrl;
  }

  const admin = createAdminClient();
  if (!admin) return null;

  const { data: adminData, error: adminError } = await admin.storage
    .from("evidence")
    .createSignedUrl(storagePath, 3600);

  if (!adminError && adminData?.signedUrl) {
    return adminData.signedUrl;
  }

  return null;
}

export async function resolveEvidenceEntry(
  supabase: SupabaseClient,
  entry: string,
  submitterUserId: string,
): Promise<ResolvedEvidence> {
  const external = entry.startsWith("http://") || entry.startsWith("https://") ? entry : null;

  if (external) {
    return {
      label: entry.length > 48 ? `${entry.slice(0, 45)}…` : entry,
      href: external,
      kind: "link",
      storagePath: null,
      unavailable: false,
    };
  }

  const storagePath = resolveEvidenceStoragePath(entry, submitterUserId);
  if (!storagePath) {
    return {
      label: entry,
      href: null,
      kind: "file",
      storagePath: null,
      unavailable: true,
    };
  }

  const fileName = storagePath.split("/").pop() ?? storagePath;
  const signedUrl = await signEvidenceStoragePath(supabase, storagePath);

  return {
    label: fileName,
    href: signedUrl,
    kind: evidenceKindFromName(fileName),
    storagePath,
    unavailable: !signedUrl,
  };
}
