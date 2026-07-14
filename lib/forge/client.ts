import {
  type AttachmentUploadResult,
  fileToUploadBlob,
} from "@/lib/forge/attachments";
import {
  FORGE_ASSIGNEE_EMAIL,
  FORGE_ASSIGNEE_NAME,
  FORGE_PROJECT_KEY,
  getForgeAssigneeIdFromEnv,
  getForgeBaseUrl,
  isForgeConfigured,
} from "@/lib/forge/config";

export class ForgeApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ForgeApiError";
  }
}

type ForgeListResponse<T> = {
  data: T[];
  pagination?: { limit: number; offset: number; total: number; has_more: boolean };
};

type ForgeMember = { id: string; name: string; email: string; role: string };
type ForgeCategory = { id: string; name: string; parent_id: string | null; position: number };

export type ForgeIssue = {
  id: string;
  number: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  type: string;
  assignee_id: string | null;
  category_id: string | null;
  environment: string | null;
  created_at: string;
  updated_at: string;
};

export type ForgeIssueCreated = ForgeIssue & { key?: string; project?: string };

let cachedAssigneeId: string | null | undefined;

async function forgeFetch(path: string, init?: RequestInit) {
  const apiKey = process.env.FORGE_API_KEY?.trim();
  if (!apiKey) {
    throw new ForgeApiError(503, "FORGE_API_KEY is not configured.");
  }

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${apiKey}`);

  const timeoutMs = 5_000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${getForgeBaseUrl()}${path}`, {
      ...init,
      headers,
      cache: "no-store",
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new ForgeApiError(res.status, text || `Forge API ${res.status}`);
    }

    return res;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ForgeApiError(504, "Forge API timed out after 5s");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function resolveForgeAssigneeId(): Promise<string | null> {
  const fromEnv = getForgeAssigneeIdFromEnv();
  if (fromEnv) {
    return fromEnv;
  }

  if (cachedAssigneeId !== undefined) {
    return cachedAssigneeId;
  }

  const res = await forgeFetch(`/api/v1/projects/${FORGE_PROJECT_KEY}/members`);
  const json = (await res.json()) as { data: ForgeMember[] };

  const emailNeedle = FORGE_ASSIGNEE_EMAIL.trim().toLowerCase();
  const nameNeedle = FORGE_ASSIGNEE_NAME.trim().toLowerCase();

  const match =
    json.data.find((member) => member.email?.toLowerCase() === emailNeedle) ??
    json.data.find((member) => member.name?.trim().toLowerCase() === nameNeedle) ??
    json.data.find((member) => member.name?.trim().toLowerCase().includes(nameNeedle));

  cachedAssigneeId = match?.id ?? null;
  return cachedAssigneeId;
}

export async function listForgeCategories(): Promise<ForgeCategory[]> {
  const res = await forgeFetch(`/api/v1/projects/${FORGE_PROJECT_KEY}/categories`);
  const json = (await res.json()) as { data: ForgeCategory[] };
  return json.data ?? [];
}

export async function listForgeIssues(params: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<ForgeListResponse<ForgeIssue>> {
  const search = new URLSearchParams({
    project: FORGE_PROJECT_KEY,
    limit: String(params.limit ?? 100),
    offset: String(params.offset ?? 0),
  });
  if (params.status && params.status !== "all") {
    search.set("status", params.status);
  }

  const res = await forgeFetch(`/api/v1/issues?${search.toString()}`);
  return (await res.json()) as ForgeListResponse<ForgeIssue>;
}

export async function createForgeIssue(input: {
  title: string;
  description?: string;
  priority: string;
  category_id?: string | null;
  status?: string;
  environment?: string;
  assignee_id?: string | null;
}): Promise<ForgeIssueCreated> {
  const assigneeId = input.assignee_id ?? (await resolveForgeAssigneeId());

  const res = await forgeFetch("/api/v1/issues", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input.title,
      description: input.description,
      projectKey: FORGE_PROJECT_KEY,
      type: "bug",
      status: input.status ?? "backlog",
      priority: input.priority,
      category_id: input.category_id ?? null,
      assignee_id: assigneeId,
      environment: input.environment ?? "uat",
    }),
  });

  const json = (await res.json()) as { data: ForgeIssueCreated };
  return json.data;
}

export async function updateForgeIssue(
  id: string,
  patch: Partial<{
    title: string;
    description: string | null;
    status: string;
    priority: string;
    category_id: string | null;
    assignee_id: string | null;
  }>,
): Promise<ForgeIssue> {
  const res = await forgeFetch(`/api/v1/issues/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const json = (await res.json()) as { data: ForgeIssue };
  return json.data;
}

export async function addForgeComment(
  issueId: string,
  body: string,
  authorLabel: string,
): Promise<void> {
  await forgeFetch(`/api/v1/issues/${issueId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body, author_label: authorLabel }),
  });
}

export async function uploadForgeAttachment(issueId: string, file: File | Blob, filename: string) {
  const blob = await fileToUploadBlob(file, filename);
  const form = new FormData();
  form.append("file", blob, filename);

  await forgeFetch(`/api/v1/issues/${issueId}/attachments`, {
    method: "POST",
    body: form,
  });
}

/** Forge requires create-then-upload — never parallel with issue create. */
export async function uploadForgeAttachmentsSequential(
  issueId: string,
  files: Array<File | Blob>,
  filenames: string[],
): Promise<AttachmentUploadResult> {
  const uploaded: string[] = [];
  const failed: AttachmentUploadResult["failed"] = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const filename = filenames[index] ?? `attachment-${index + 1}`;
    try {
      await uploadForgeAttachment(issueId, file, filename);
      uploaded.push(filename);
    } catch (error) {
      failed.push({
        filename,
        error: error instanceof Error ? error.message : "Upload failed",
      });
    }
  }

  return { uploaded, failed };
}

export function issueKey(number: number) {
  return `${FORGE_PROJECT_KEY}-${number}`;
}

export function forgeEnabled() {
  return isForgeConfigured();
}
