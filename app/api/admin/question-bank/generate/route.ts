import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceAiRateLimit } from "@/lib/ai/enforce-rate-limit";
import { logAiUsage } from "@/lib/ai/log-usage";
import { resolveAiProviderForTenant } from "@/lib/ai/resolve-provider-for-user";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import { playbookBodySchema } from "@/lib/playbooks/types";
import { existingSolution, existingStems, insertDrafts, type QuestionSource } from "@/lib/question-bank/data";
import { DEFAULT_SOLUTION } from "@/lib/question-bank/model";
import { draftFromDocs, draftFromPlaybook } from "@/lib/question-bank/generate";

export const maxDuration = 120;

const solution = z.string().trim().min(2).max(80).optional();
const schema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("playbook"), playbookId: z.string().uuid(), count: z.number().int().min(3).max(15).default(8), solution }),
  z.object({
    kind: z.enum(["docs", "developer"]),
    solution,
    topic: z.string().trim().min(3).max(120),
    count: z.number().int().min(3).max(15).default(8),
  }),
]);

/** Drafts a fresh set of questions for a source. Drafts wait for review before anyone sees them. */
export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the form." }, { status: 400 });
  const input = parsed.data;

  const { model, provider, modelName, docsSearch } = await resolveAiProviderForTenant(session.tenantId);
  if (!model) return NextResponse.json({ error: "AI isn't configured for this workspace." }, { status: 503 });
  const rateLimited = await enforceAiRateLimit(session.supabase, session.user.id);
  if (rateLimited) return rateLimited;
  const log = (usage: Parameters<typeof logAiUsage>[1]["usage"]) =>
    logAiUsage(session.supabase, { feature: "question_bank", provider, model: modelName, userId: session.user.id, usage, tenantId: session.tenantId });

  try {
    if (input.kind === "playbook") {
      const admin = getTenantAdminClient() as unknown as SupabaseClient | null;
      const { data } = admin
        ? await admin.from("capability_playbooks").select("id, title, chapter, body").eq("tenant_id", session.tenantId).eq("id", input.playbookId).maybeSingle()
        : { data: null };
      const row = data as { id: string; title: string; chapter: number; body: unknown } | null;
      if (!row) return NextResponse.json({ error: "Playbook not found." }, { status: 404 });
      const source: QuestionSource = { kind: "playbook", playbookId: row.id, topic: "", title: row.title };
      const result = await draftFromPlaybook({
        model,
        title: row.title,
        body: playbookBodySchema.parse(row.body ?? {}),
        count: input.count,
        existing: await existingStems(session.tenantId, source),
      });
      await log(result.usage);
      const saved = await insertDrafts({
        tenantId: session.tenantId,
        userId: session.user.id,
        source,
        drafts: result.questions,
        sourceTitle: `Ch. ${row.chapter} ${row.title}`,
        solution: input.solution ?? (await existingSolution(session.tenantId, source)) ?? DEFAULT_SOLUTION,
      });
      return NextResponse.json(saved);
    }

    if (!docsSearch) return NextResponse.json({ error: "Docs search isn't available with this AI provider." }, { status: 503 });
    const source: QuestionSource = { kind: input.kind, playbookId: null, topic: input.topic, title: input.topic };
    const result = await draftFromDocs({
      searchModel: docsSearch.model,
      searchTools: docsSearch.tools,
      model,
      site: input.kind,
      topic: input.topic,
      area: input.solution,
      count: input.count,
      existing: await existingStems(session.tenantId, source),
    });
    await Promise.all(result.usage.map((usage) => log(usage)));
    if (!result.questions.length) {
      return NextResponse.json(
        { error: `Couldn't find enough on ${input.kind === "docs" ? "documentation" : "developer"}.sailpoint.com about that. Try a more specific topic.` },
        { status: 422 },
      );
    }
    const saved = await insertDrafts({
      tenantId: session.tenantId,
      userId: session.user.id,
      source,
      drafts: result.questions,
      pages: result.pages,
      solution: input.solution ?? (await existingSolution(session.tenantId, source)) ?? DEFAULT_SOLUTION,
    });
    return NextResponse.json(saved);
  } catch {
    return NextResponse.json({ error: "The AI couldn't write questions just now. Try again in a moment." }, { status: 502 });
  }
}
