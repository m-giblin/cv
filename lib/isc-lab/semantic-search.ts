import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { IscLabSource } from "@/lib/isc-lab/retrieve-context";

type ChunkRow = {
  id: string;
  kind: string;
  url: string | null;
  title: string;
  body: string;
  tags: string[] | null;
  rank: number;
  source_fetched_at: string | null;
  content_version: string | null;
};

export async function searchKnowledgeChunks(
  supabase: SupabaseClient<Database>,
  query: string,
  limit = 8,
): Promise<IscLabSource[]> {
  const { data, error } = await supabase.rpc("search_isc_lab_chunks", {
    search_query: query,
    result_limit: limit,
  });

  if (error || !data?.length) {
    return [];
  }

  return (data as ChunkRow[]).map((row) => ({
    url: row.url ?? `https://www.sailpoint.com/`,
    title: row.title,
    source: row.kind === "battlecard" ? "battlecard" : (row.kind as IscLabSource["source"]),
    excerpt: row.body.slice(0, 2800),
    fetchedAt: row.source_fetched_at ?? new Date().toISOString(),
    contentVersion: row.content_version ?? "curated",
    rank: row.rank,
    kind: row.kind,
  }));
}

export async function upsertFetchedDocChunk(
  supabase: SupabaseClient<Database>,
  input: {
    url: string;
    title: string;
    excerpt: string;
    kind: "documentation" | "developer" | "marketing";
    tags?: string[];
  },
) {
  const contentHash = `${input.url}:${input.excerpt.length}`;
  const row = {
    kind: input.kind,
    url: input.url,
    title: input.title,
    body: input.excerpt,
    tags: input.tags ?? [],
    source_fetched_at: new Date().toISOString(),
    content_version: contentHash.slice(0, 64),
  };

  const { data: existing } = await supabase
    .from("isc_lab_knowledge_chunks")
    .select("id")
    .eq("url", input.url)
    .maybeSingle();

  if (existing?.id) {
    await supabase.from("isc_lab_knowledge_chunks").update(row).eq("id", existing.id);
    return;
  }

  await supabase.from("isc_lab_knowledge_chunks").insert(row);
}
