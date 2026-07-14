import { NextResponse } from "next/server";
import { z } from "zod";
import { auditMutation } from "@/lib/audit/audit-mutation";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { assertTenantOwnedRow, tenantTable } from "@/lib/data/tenant-scoped-query";

const schema = z.object({
 title: z.string().min(2),
 url: z.string().url(),
 category: z.string().min(2),
 assetType: z.enum(["video", "doc", "podcast", "link", "file"]).optional(),
 projectTags: z.array(z.string()).optional(),
 moduleTags: z.array(z.string()).optional(),
});

export async function PATCH(
 request: Request,
 context: { params: Promise<{ id: string }> },
) {
 const session = await requireAdminSession();
 if (session instanceof NextResponse) {
 return session;
 }

 const scoped = tenantTable(session.tenantId);
 if (!scoped) {
 return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
 }

 const { id } = await context.params;
 const parsed = schema.safeParse(await request.json());

 if (!parsed.success) {
 return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 }

 const owned = await assertTenantOwnedRow(session.tenantId, "content_assets", id);
 if (!owned) {
 return NextResponse.json({ error: "Asset not found." }, { status: 404 });
 }

 const { error } = await scoped
 .from("content_assets")
 .update({
 title: parsed.data.title,
 description: parsed.data.category,
 storage_path: parsed.data.url,
 ...(parsed.data.assetType ? { asset_type: parsed.data.assetType } : {}),
 ...(parsed.data.projectTags ? { project_tags: parsed.data.projectTags } : {}),
 ...(parsed.data.moduleTags ? { module_tags: parsed.data.moduleTags } : {}),
 })
 .eq("id", id)
 .eq("tenant_id", session.tenantId);

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 auditMutation(session.user.id, "content_asset.updated", "content_asset", id, parsed.data, session.tenantId);

 return NextResponse.json({ success: true });
}

export async function DELETE(
 _request: Request,
 context: { params: Promise<{ id: string }> },
) {
 const session = await requireAdminSession();
 if (session instanceof NextResponse) {
 return session;
 }

 const scoped = tenantTable(session.tenantId);
 if (!scoped) {
 return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
 }

 const { id } = await context.params;

 const owned = await assertTenantOwnedRow(session.tenantId, "content_assets", id);
 if (!owned) {
 return NextResponse.json({ error: "Asset not found." }, { status: 404 });
 }

 const { error } = await scoped.from("content_assets").delete().eq("id", id).eq("tenant_id" as never, session.tenantId);

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 auditMutation(session.user.id, "content_asset.deleted", "content_asset", id, undefined, session.tenantId);

 return NextResponse.json({ success: true });
}
