/** MIME helpers + sequential upload for Forge's two-call attachment flow. */

const EXT_TO_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export function guessMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_MIME[ext] ?? "application/octet-stream";
}

export function resolveUploadContentType(file: File | Blob, filename: string): string {
  const fromFile = file instanceof File ? file.type : file.type;
  if (fromFile && fromFile !== "application/octet-stream") {
    return fromFile;
  }
  return guessMimeType(filename);
}

export async function fileToUploadBlob(file: File | Blob, filename: string): Promise<Blob> {
  const contentType = resolveUploadContentType(file, filename);
  const bytes = await file.arrayBuffer();
  return new Blob([bytes], { type: contentType });
}

export type AttachmentUploadResult = {
  uploaded: string[];
  failed: Array<{ filename: string; error: string }>;
};
