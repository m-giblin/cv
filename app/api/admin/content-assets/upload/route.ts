import { NextResponse } from "next/server";
import { auditMutation } from "@/lib/audit/audit-mutation";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = new Set([
 "application/pdf",
 "image/png",
 "image/jpeg",
 "image/webp",
 "text/plain",
 "text/markdown",
 "application/vnd.openxmlformats-officedocument.presentationml.presentation",
 "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export async function POST(request: Request) {
 const session = await requireAdminSession();
 if (session instanceof NextResponse) {
 return session;
 }

 const formData = await request.formData();
 const file = formData.get("file");

 if (!(file instanceof File) || file.size === 0) {
 return NextResponse.json({ error: "File is required" }, { status: 400 });
 }

 if (file.size > MAX_UPLOAD_BYTES) {
 return NextResponse.json({ error: "File exceeds 25MB limit." }, { status: 400 });
 }

 const mime = file.type || "application/octet-stream";
 if (!ALLOWED_UPLOAD_TYPES.has(mime)) {
 return NextResponse.json({ error: "File type not allowed." }, { status: 400 });
 }

 const title = String(formData.get("title") ?? file.name);
 const category = String(formData.get("category") ?? "solution_brief");
 const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
 const storagePath = `${session.user.id}/${Date.now()}-${safeName}`;

 const service = createAdminClient();
 if (!service) {
 return NextResponse.json({ error: "Service role not configured" }, { status: 503 });
 }

 const buffer = Buffer.from(await file.arrayBuffer());
 const { error: uploadError } = await service.storage.from("content").upload(storagePath, buffer, {
 contentType: file.type || "application/octet-stream",
 upsert: false,
 });

 if (uploadError) {
 return NextResponse.json({ error: uploadError.message }, { status: 500 });
 }

 const { data: publicUrl } = service.storage.from("content").getPublicUrl(storagePath);

 const { data: created, error } = await service.from("content_assets").insert({
 title,
 description: category,
 storage_path: publicUrl.publicUrl,
 content_type: file.type || "file",
 created_by: session.user.id,
 tenant_id: session.tenantId,
 } as never).select("id").single();

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 auditMutation(
 session.user.id,
 "content_asset.created",
 "content_asset",
 created.id,
 { title, upload: true, mime },
 session.tenantId,
 );

 return NextResponse.json({ success: true, url: publicUrl.publicUrl, id: created.id });
}
