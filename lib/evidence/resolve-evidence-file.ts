import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export type ResolvedEvidence = {
  label: string;
  href: string | null;
  kind: "image" | "file" | "link";
  storagePath: string | null;
  unavailable: boolean;
};

export function evidenceKindFromName(fileName: string): ResolvedEvidence["kind"] {
  const lower = fileName.toLowerCase();
  if (/\.(png|jpe?g|webp|gif)$/.test(lower)) return "image";
  if (lower.startsWith("http://") || lower.startsWith("https://")) return "link";
  return "file";
}

/** Normalize legacy demo paths and storage: prefixes to a bucket object path. */
export function resolveEvidenceStoragePath(entry: string, submitterUserId: string): string | null {
  const trimmed = entry.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return null;
  }

  if (trimmed.startsWith("storage:evidence/")) {
    return trimmed.replace(/^storage:evidence\//, "");
  }

  if (trimmed.startsWith("evidence/")) {
    return trimmed.replace(/^evidence\//, "");
  }

  if (trimmed.startsWith("demo-se/")) {
    const fileName = trimmed.slice("demo-se/".length);
    return `${submitterUserId}/${fileName}`;
  }

  if (trimmed.includes("/")) {
    return trimmed;
  }

  return `${submitterUserId}/${trimmed}`;
}

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

export function isPdfEvidence(item: Pick<ResolvedEvidence, "label" | "kind">) {
  return item.kind === "file" && item.label.toLowerCase().endsWith(".pdf");
}
