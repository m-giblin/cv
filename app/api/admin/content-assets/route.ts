import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/auth/require-admin";

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

  const { data, error } = await session.supabase
    .from("content_assets")
    .select("*")
    .order("title");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ assets: (data ?? []).map(mapRow) });
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

  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { error } = await session.supabase.from("content_assets").insert({
    title: parsed.data.title,
    description: parsed.data.category,
    storage_path: parsed.data.url,
    content_type: "external_link",
    asset_type: parsed.data.assetType,
    project_tags: parsed.data.projectTags,
    module_tags: parsed.data.moduleTags,
    is_link_only: true,
    created_by: session.user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
