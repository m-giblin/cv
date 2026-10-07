import type { SupabaseClient } from "@supabase/supabase-js";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import type { DrillStatus } from "@/lib/playbooks/drills";
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

/** Practice drills a reader can start from a playbook: its active Pitch Studio scenarios. */
export type ReaderDrills = Record<string, { id: string; label: string }[]>;

export type PlaybookLibrary = {
  guides: PlaybookGuide[];
  playbooks: CapabilityPlaybook[];
  /** Admin view only: drill status per playbook id. */
  drills?: Record<string, DrillStatus>;
  /** Reader view only: pitch drills per playbook id. */
  pitchDrills?: ReaderDrills;
};

/** Which drills exist for each playbook, and which playbook version they were built from. */
export async function loadDrillStatus(tenantId: string, playbookIds: string[]): Promise<Record<string, DrillStatus>> {
  const status: Record<string, DrillStatus> = Object.fromEntries(
    playbookIds.map((id) => [id, { pitchDrills: [], objectionDrill: null }]),
  );
  const admin = getTenantAdminClient();
  if (!admin || !playbookIds.length) return status;
  const [pitches, sims] = await Promise.all([
    admin
      .from("pitch_scenario_templates")
      .select("id, slug, label, source_playbook_id, source_version, active")
      .eq("tenant_id", tenantId)
      .in("source_playbook_id", playbookIds)
      .order("sort_order"),
    admin
      .from("simulation_templates")
      .select("id, source_playbook_id, source_version")
      .eq("tenant_id", tenantId)
      .in("source_playbook_id", playbookIds),
  ]);
  for (const row of (pitches.data ?? []) as {
    id: string;
    slug: string;
    label: string;
    source_playbook_id: string;
    source_version: number | null;
    active: boolean;
  }[]) {
    status[row.source_playbook_id]?.pitchDrills.push({
      id: row.id,
      slug: row.slug,
      label: row.label,
      sourceVersion: row.source_version,
      active: row.active,
    });
  }
  for (const row of (sims.data ?? []) as { id: string; source_playbook_id: string; source_version: number | null }[]) {
    const entry = status[row.source_playbook_id];
    if (entry) entry.objectionDrill = { id: row.id, sourceVersion: row.source_version };
  }
  return status;
}

/** Admin view: every guide and every chapter (drafts included) for one tenant. */
export async function loadAdminPlaybooks(tenantId: string): Promise<PlaybookLibrary | null> {
  const admin = getTenantAdminClient();
  if (!admin) return null;
  const [guides, playbooks] = await Promise.all([
    admin.from("playbook_guides").select(GUIDE_COLUMNS).eq("tenant_id", tenantId).order("created_at", { ascending: false }),
    admin.from("capability_playbooks").select(PLAYBOOK_COLUMNS).eq("tenant_id", tenantId).order("chapter"),
  ]);
  if (guides.error || playbooks.error) return null;
  const mapped = ((playbooks.data ?? []) as PlaybookRow[]).map(mapPlaybook);
  return {
    guides: ((guides.data ?? []) as GuideRow[]).map(mapGuide),
    playbooks: mapped,
    drills: await loadDrillStatus(tenantId, mapped.map((playbook) => playbook.id)),
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

  const pitchDrills: ReaderDrills = {};
  if (published.length) {
    const { data } = await supabase
      .from("pitch_scenario_templates")
      .select("id, label, source_playbook_id")
      .eq("active", true)
      .in(
        "source_playbook_id",
        published.map((playbook) => playbook.id),
      )
      .order("sort_order");
    for (const row of (data ?? []) as { id: string; label: string; source_playbook_id: string }[]) {
      (pitchDrills[row.source_playbook_id] ??= []).push({ id: row.id, label: row.label });
    }
  }
  return {
    guides: ((guides.data ?? []) as GuideRow[]).map(mapGuide).filter((guide) => withContent.has(guide.id)),
    playbooks: published,
    pitchDrills,
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
