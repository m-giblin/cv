import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";
import { FORGE_DEFAULT_STATUS } from "@/lib/forge/config";
import {
 ForgeApiError,
 addForgeComment,
 createForgeIssue,
 issueKey,
 listForgeIssues,
 uploadForgeAttachmentsSequential,
} from "@/lib/forge/client";

function normalizeCategoryId(value: string | null | undefined) {
 if (!value || value === "general" || !/^[0-9a-f-]{36}$/i.test(value)) {
 return null;
 }
 return value;
}

const createSchema = z.object({
 title: z.string().min(3).max(500),
 comments: z.string().max(10_000).optional(),
 priority: z.enum(["critical", "high", "medium", "low"]),
 category_id: z.string().nullable().optional(),
 page_url: z.string().max(2000).optional(),
 reporter_name: z.string().max(200).optional(),
 reporter_email: z.string().email().optional(),
});

export async function GET(request: Request) {
 const session = await requireAuthenticatedSession();
 if (session instanceof NextResponse) {
 return session;
 }

 const url = new URL(request.url);
 const status = url.searchParams.get("status") ?? FORGE_DEFAULT_STATUS;

 try {
 const result = await listForgeIssues({ status, limit: 100 });
 return NextResponse.json(result);
 } catch (error) {
 const message = error instanceof ForgeApiError ? error.message : "Failed to list issues.";
 return NextResponse.json({ error: message }, { status: 502 });
 }
}

export async function POST(request: Request) {
 const session = await requireAuthenticatedSession();
 if (session instanceof NextResponse) {
 return session;
 }

 const contentType = request.headers.get("content-type") ?? "";

 if (contentType.includes("multipart/form-data")) {
 return handleMultipartCreate(request, session.user);
 }

 const parsed = createSchema.safeParse(await request.json());
 if (!parsed.success) {
 return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 }

 try {
 const issue = await createForgeIssueFromPayload(parsed.data, session.user.email ?? undefined);
 return NextResponse.json(
 { data: { ...issue, key: issue.key ?? issueKey(issue.number) } },
 { status: 201 },
 );
 } catch (error) {
 const message = error instanceof ForgeApiError ? error.message : "Failed to create issue.";
 return NextResponse.json({ error: message }, { status: 502 });
 }
}

async function handleMultipartCreate(
 request: Request,
 user: { email?: string; user_metadata?: Record<string, unknown> },
) {
 const form = await request.formData();
 const title = String(form.get("title") ?? "").trim();
 const comments = String(form.get("comments") ?? "").trim();
 const priority = String(form.get("priority") ?? "high");
 const categoryIdRaw = form.get("category_id");
 const pageUrl = String(form.get("page_url") ?? "").trim();
 const reporterName = String(form.get("reporter_name") ?? "").trim();

 const parsed = createSchema.safeParse({
 title,
 comments: comments || undefined,
 priority,
 category_id: categoryIdRaw ? String(categoryIdRaw) : null,
 page_url: pageUrl || undefined,
 reporter_name: reporterName || undefined,
 reporter_email: user.email,
 });

 if (!parsed.success) {
 return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 }

 try {
 const issue = await createForgeIssueFromPayload(parsed.data, user.email);
 const files = form.getAll("files").filter((item): item is File => item instanceof File);

 // Forge two-call flow: issue must exist before any attachment upload.
 const attachments =
 files.length > 0
 ? await uploadForgeAttachmentsSequential(
 issue.id,
 files,
 files.map((file) => file.name),
 )
 : { uploaded: [], failed: [] };

 if (attachments.failed.length > 0 && attachments.uploaded.length === 0) {
 return NextResponse.json(
 {
 data: { ...issue, key: issue.key ?? issueKey(issue.number) },
 attachments,
 error: "Issue created but attachments failed to upload.",
 },
 { status: 207 },
 );
 }

 return NextResponse.json(
 {
 data: { ...issue, key: issue.key ?? issueKey(issue.number) },
 attachments,
 },
 { status: 201 },
 );
 } catch (error) {
 const message = error instanceof ForgeApiError ? error.message : "Failed to create issue.";
 return NextResponse.json({ error: message }, { status: 502 });
 }
}

async function createForgeIssueFromPayload(
 data: z.infer<typeof createSchema>,
 reporterEmail?: string,
) {
 const descriptionParts = [
 "## UAT bug report",
 data.reporter_name ? `**Reporter:** ${data.reporter_name}` : null,
 reporterEmail ? `**Email:** ${reporterEmail}` : null,
 data.page_url ? `**Page:** ${data.page_url}` : null,
 data.comments ? `\n### Notes\n${data.comments}` : null,
 ].filter(Boolean);

 const issue = await createForgeIssue({
 title: data.title,
 description: descriptionParts.join("\n"),
 priority: data.priority,
 category_id: normalizeCategoryId(data.category_id),
 status: FORGE_DEFAULT_STATUS,
 environment: "uat",
 });

 if (data.comments?.trim()) {
 await addForgeComment(
 issue.id,
 data.comments.trim(),
 data.reporter_name ?? reporterEmail ?? "UAT tester",
 );
 }

 return issue;
}
