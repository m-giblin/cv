import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/auth/require-admin";

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

  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { error } = await session.supabase
    .from("content_assets")
    .update({
      title: parsed.data.title,
      description: parsed.data.category,
      storage_path: parsed.data.url,
      ...(parsed.data.assetType ? { asset_type: parsed.data.assetType } : {}),
      ...(parsed.data.projectTags ? { project_tags: parsed.data.projectTags } : {}),
      ...(parsed.data.moduleTags ? { module_tags: parsed.data.moduleTags } : {}),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

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

  const { id } = await context.params;
  const { error } = await session.supabase.from("content_assets").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
