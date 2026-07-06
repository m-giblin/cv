import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { searchKnowledgeChunks } from "@/lib/isc-lab/semantic-search";

export async function loadCorpusAssetsForTags(
  supabase: SupabaseClient<Database>,
  tags: string[],
  limit = 8,
) {
  if (tags.length === 0) return [];

  const { data } = await supabase.from("content_assets").select("*").order("title");

  return (data ?? [])
    .filter((asset) => {
      const assetTags = [...(asset.project_tags ?? []), ...(asset.module_tags ?? [])].map((t) =>
        t.toLowerCase(),
      );
      return tags.some((tag) => assetTags.includes(tag.toLowerCase()));
    })
    .slice(0, limit)
    .map((row) => ({
      id: row.id,
      title: row.title,
      url: row.storage_path,
      projectTags: row.project_tags ?? [],
      moduleTags: row.module_tags ?? [],
      assetType: row.asset_type,
    }));
}

export async function answerCorpusQuestionWithConfidence(
  supabase: SupabaseClient<Database>,
  question: string,
  tags: string[],
): Promise<{
  answer: string;
  confidence: number;
  sources: Array<{ title: string; url: string }>;
}> {
  const corpusAssets = await loadCorpusAssetsForTags(supabase, tags, 5);
  const chunks = await searchKnowledgeChunks(supabase, question, 5);

  const corpusBlock = corpusAssets
    .map((a) => `- ${a.title}: ${a.url}`)
    .join("\n");
  const chunkBlock = chunks
    .map((c) => `- ${c.title}: ${c.excerpt.slice(0, 200)}`)
    .join("\n");

  const hasCorpus = corpusAssets.length > 0;
  const hasChunks = chunks.length > 0;

  let confidence = 0.35;
  if (hasCorpus && hasChunks) confidence = 0.82;
  else if (hasCorpus || hasChunks) confidence = 0.62;

  const answer = [
    hasChunks ? `From ISC knowledge:\n${chunkBlock}` : null,
    hasCorpus ? `Approved corpus assets:\n${corpusBlock}` : null,
    !hasCorpus && !hasChunks
      ? "No high-confidence grounded sources found — routing to SME recommended."
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const sources = [
    ...corpusAssets.map((a) => ({ title: a.title, url: a.url })),
    ...chunks.map((c) => ({ title: c.title, url: c.url })),
  ];

  return { answer, confidence, sources };
}

export async function syncCorpusAssetToLabIndex(
  supabase: SupabaseClient<Database>,
  assetId: string,
) {
  const { data: asset } = await supabase
    .from("content_assets")
    .select("id, title, storage_path, project_tags, module_tags, description")
    .eq("id", assetId)
    .maybeSingle();

  if (!asset?.storage_path) return;

  const tags = [...(asset.project_tags ?? []), ...(asset.module_tags ?? [])].join(", ");
  const body = `${asset.title}\n${asset.description ?? ""}\nTags: ${tags}\nURL: ${asset.storage_path}`;

  const { upsertFetchedDocChunk } = await import("@/lib/isc-lab/semantic-search");
  await upsertFetchedDocChunk(supabase, {
    url: asset.storage_path,
    title: asset.title,
    excerpt: body.slice(0, 2000),
    kind: "documentation",
    tags: [...(asset.project_tags ?? []), ...(asset.module_tags ?? [])],
  });
}
