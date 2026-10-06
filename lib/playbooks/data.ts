import type { SupabaseClient } from "@supabase/supabase-js";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import {
  emptyPlaybookBody,
  guideBodySchema,
  playbookBodySchema,
  type CapabilityPlaybook,
  type ParsedGuide,
  type PlaybookGuide,
  type PlaybookStatus,
} from "@/lib/playbooks/types";

type GuideRow = {
  id: string;
  title: string;
  segment: string;
  segment_label: string | null;
  edition: string | null;
  source_name: string | null;
  body: unknown;
  created_at: string;
  updated_at: string;
};

type PlaybookRow = {
  id: string;
  guide_id: string;
  chapter: number;
  slug: string;
  title: string;
  status: PlaybookStatus;
  version: number;
  body: unknown;
  published_at: string | null;
  updated_at: string;
};

const GUIDE_COLUMNS = "id, title, segment, segment_label, edition, source_name, body, created_at, updated_at";
const PLAYBOOK_COLUMNS = "id, guide_id, chapter, slug, title, status, version, body, published_at, updated_at";

export function mapGuide(row: GuideRow): PlaybookGuide {
  const body = guideBodySchema.safeParse(row.body ?? {});
  return {
    id: row.id,
    title: row.title,
    segment: row.segment,
    segmentLabel: row.segment_label,
    edition: row.edition,
    sourceName: row.source_name,
    body: body.success ? body.data : { audience: "", routing: [], sections: [] },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapPlaybook(row: PlaybookRow): CapabilityPlaybook {
  const body = playbookBodySchema.safeParse(row.body ?? {});
  return {
    id: row.id,
    guideId: row.guide_id,
    chapter: row.chapter,
    slug: row.slug,
    title: row.title,
    status: row.status,
    version: row.version,
    body: body.success ? body.data : emptyPlaybookBody(),
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  };
}

export type PlaybookLibrary = { guides: PlaybookGuide[]; playbooks: CapabilityPlaybook[] };

/** Admin view: every guide and every chapter (drafts included) for one tenant. */
export async function loadAdminPlaybooks(tenantId: string): Promise<PlaybookLibrary | null> {
  const admin = getTenantAdminClient();
  if (!admin) return null;
  const [guides, playbooks] = await Promise.all([
    admin.from("playbook_guides").select(GUIDE_COLUMNS).eq("tenant_id", tenantId).order("created_at", { ascending: false }),
    admin.from("capability_playbooks").select(PLAYBOOK_COLUMNS).eq("tenant_id", tenantId).order("chapter"),
  ]);
  if (guides.error || playbooks.error) return null;
  return {
    guides: ((guides.data ?? []) as GuideRow[]).map(mapGuide),
    playbooks: ((playbooks.data ?? []) as PlaybookRow[]).map(mapPlaybook),
  };
}

/** Reader view: published chapters only, through the member's own session (RLS scopes the tenant). */
export async function loadPublishedPlaybooks(supabase: SupabaseClient): Promise<PlaybookLibrary> {
  const [guides, playbooks] = await Promise.all([
    supabase.from("playbook_guides").select(GUIDE_COLUMNS).order("created_at", { ascending: false }),
    supabase.from("capability_playbooks").select(PLAYBOOK_COLUMNS).eq("status", "published").order("chapter"),
  ]);
  const published = ((playbooks.data ?? []) as PlaybookRow[]).map(mapPlaybook);
  const withContent = new Set(published.map((playbook) => playbook.guideId));
  return {
    guides: ((guides.data ?? []) as GuideRow[]).map(mapGuide).filter((guide) => withContent.has(guide.id)),
    playbooks: published,
  };
}

/** Saves a parsed guide as a new guide with every chapter in draft. */
export async function insertParsedGuide(
  tenantId: string,
  userId: string,
  parsed: ParsedGuide,
  sourceName: string,
): Promise<{ guideId: string } | { error: string }> {
  const admin = getTenantAdminClient();
  if (!admin) return { error: "Service unavailable." };

  const { data: guide, error } = await admin
    .from("playbook_guides")
    .insert({
      tenant_id: tenantId,
      title: parsed.title,
      segment: parsed.segment,
      segment_label: parsed.segmentLabel || null,
      edition: parsed.edition || null,
      source_name: sourceName,
      body: parsed.body,
      created_by: userId,
    })
    .select("id")
    .single();
  if (error || !guide) return { error: error?.message ?? "Couldn't save the guide." };

  const guideId = (guide as { id: string }).id;
  if (parsed.playbooks.length) {
    const { error: chapterError } = await admin.from("capability_playbooks").insert(
      parsed.playbooks.map((playbook) => ({
        tenant_id: tenantId,
        guide_id: guideId,
        chapter: playbook.chapter,
        slug: playbook.slug,
        title: playbook.title,
        body: playbook.body,
        updated_by: userId,
      })),
    );
    if (chapterError) {
      await admin.from("playbook_guides").delete().eq("id", guideId);
      return { error: chapterError.message };
    }
  }
  return { guideId };
}
