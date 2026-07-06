import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim().toLowerCase() ?? "";
  const category = searchParams.get("category");
  const projectTag = searchParams.get("projectTag")?.trim().toLowerCase() ?? "";

  let builder = supabase.from("content_assets").select("*").order("title");

  if (category) {
    builder = builder.eq("description", category);
  }

  const { data, error } = await builder;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const assets = (data ?? [])
    .map((row) => ({
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
      updatedAt: row.updated_at,
    }))
    .filter((asset) => {
      if (projectTag && !asset.projectTags.some((tag) => tag.toLowerCase() === projectTag)) {
        return false;
      }
      if (!query) return true;
      return [asset.title, asset.category, asset.url, ...asset.projectTags, ...asset.moduleTags]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });

  return NextResponse.json({ assets });
}
