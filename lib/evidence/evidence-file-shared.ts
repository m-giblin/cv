export type EvidenceKind = "image" | "file" | "link";

export function evidenceKindFromName(fileName: string): EvidenceKind {
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

export function isPdfEvidence(item: { label: string; kind: EvidenceKind }) {
  return item.kind === "file" && item.label.toLowerCase().endsWith(".pdf");
}
