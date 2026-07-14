import { NextResponse } from "next/server";
import { z } from "zod";
import { auditMutation } from "@/lib/audit/audit-mutation";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { assertTenantOwnedRow, tenantTable } from "@/lib/data/tenant-scoped-query";

function mapRow(row: {
 id: string;
 title: string;
 description: string | null;
 storage_path: string;
 content_type: string | null;
 linked_solutions: string[];
 asset_type?: string | null;
 project_tags?: string[] | null;
 module_tags?: string[] | null;
 is_link_only?: boolean | null;
 version?: number | null;
 health_status?: string | null;
 last_verified_at?: string | null;
 created_at: string;
 updated_at: string;
}) {
 return {
 id: row.id,
 title: row.title,
 category: row.description ?? "reference",
 url: row.storage_path,
 contentType: row.content_type,
 assetType: row.asset_type ?? "link",
 projectTags: row.project_tags ?? [],
 moduleTags: row.module_tags ?? [],
 isLinkOnly: row.is_link_only ?? true,
 linkedSolutions: row.linked_solutions ?? [],
 version: row.version ?? 1,
 healthStatus: row.health_status ?? "active",
 lastVerifiedAt: row.last_verified_at,
 createdAt: row.created_at,
 updatedAt: row.updated_at,
 };
}

export async function GET() {
 const session = await requireAdminSession();
 if (session instanceof NextResponse) {
 return session;
 }

 const scoped = tenantTable(session.tenantId);
 if (!scoped) {
 return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
 }

 const { data, error } = await scoped.select("content_assets", "*").order("title");

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 return NextResponse.json({ assets: ((data ?? []) as unknown as Parameters<typeof mapRow>[0][]).map(mapRow) });
}

const schema = z.object({
 title: z.string().min(2),
 url: z.string().url(),
 category: z.string().min(2),
 assetType: z.enum(["video", "doc", "podcast", "link", "file"]).default("link"),
 projectTags: z.array(z.string()).default([]),
 moduleTags: z.array(z.string()).default([]),
});

export async function POST(request: Request) {
 const session = await requireAdminSession();
 if (session instanceof NextResponse) {
 return session;
 }

 const scoped = tenantTable(session.tenantId);
 if (!scoped) {
 return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
 }

 const parsed = schema.safeParse(await request.json());

 if (!parsed.success) {
 return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 }

 const { data: created, error } = await scoped
 .from("content_assets")
 .insert({
 title: parsed.data.title,
 description: parsed.data.category,
 storage_path: parsed.data.url,
 content_type: "external_link",
 asset_type: parsed.data.assetType,
 project_tags: parsed.data.projectTags,
 module_tags: parsed.data.moduleTags,
 is_link_only: true,
 created_by: session.user.id,
 tenant_id: session.tenantId,
 } as never)
 .select("id")
 .single();

 if (error) {
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 auditMutation(
 session.user.id,
 "content_asset.created",
 "content_asset",
 created.id,
 { title: parsed.data.title },
 session.tenantId,
 );

 return NextResponse.json({ success: true, id: created.id });
}
