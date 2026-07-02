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
      linkedSolutions: row.linked_solutions ?? [],
      updatedAt: row.updated_at,
    }))
    .filter((asset) => {
      if (!query) return true;
      return [asset.title, asset.category, asset.url].join(" ").toLowerCase().includes(query);
    });

  return NextResponse.json({ assets });
}
