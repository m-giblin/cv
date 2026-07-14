import { NextResponse } from "next/server";
import { z } from "zod";
import { auditMutation } from "@/lib/audit/audit-mutation";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { seedPitchScenariosForTenant } from "@/lib/pitch/pitch-queue";
import { tenantTable } from "@/lib/data/tenant-scoped-query";

const schema = z.object({
  slug: z.string().min(2),
  track: z.enum(["elevator", "discovery", "competitive", "executive", "governance"]),
  shortLabel: z.string().min(2),
  label: z.string().min(3),
  promptLabel: z.string().min(2),
  prompt: z.string().min(10),
  description: z.string().min(3),
  competencies: z.array(z.string()).default([]),
  linkedSolution: z.string().nullable().optional(),
  maxDurationSec: z.number().int().min(30).max(300).optional(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
  passingGrade: z.number().int().min(1).max(5).optional(),
});

export async function GET() {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const scoped = tenantTable(session.tenantId);
  if (!scoped) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  await seedPitchScenariosForTenant(session.tenantId);

  const { data, error } = await scoped
    .select(
      "pitch_scenario_templates",
      "id, slug, track, short_label, label, prompt_label, prompt, description, competencies, linked_solution, max_duration_sec, sort_order, active, passing_grade, updated_at",
    )
    .order("sort_order");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const scenarios = ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => ({
    id: row.id as string,
    slug: row.slug as string,
    track: row.track as string,
    shortLabel: row.short_label as string,
    label: row.label as string,
    promptLabel: row.prompt_label as string,
    prompt: row.prompt as string,
    description: row.description as string,
    competencies: (row.competencies as string[]) ?? [],
    linkedSolution: (row.linked_solution as string | null) ?? null,
    maxDurationSec: row.max_duration_sec as number,
    sortOrder: row.sort_order as number,
    active: row.active as boolean,
    passingGrade: row.passing_grade as number,
    updatedAt: row.updated_at as string,
  }));

  return NextResponse.json({ scenarios });
}

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const scoped = tenantTable(session.tenantId);
  if (!scoped) {
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: created, error } = await scoped
    .from("pitch_scenario_templates")
    .insert({
      tenant_id: session.tenantId,
      slug: parsed.data.slug,
      track: parsed.data.track,
      short_label: parsed.data.shortLabel,
      label: parsed.data.label,
      prompt_label: parsed.data.promptLabel,
      prompt: parsed.data.prompt,
      description: parsed.data.description,
      competencies: parsed.data.competencies,
      linked_solution: parsed.data.linkedSolution ?? null,
      max_duration_sec: parsed.data.maxDurationSec ?? 60,
      sort_order: parsed.data.sortOrder ?? 0,
      active: parsed.data.active ?? true,
      passing_grade: parsed.data.passingGrade ?? 4,
    } as never)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  auditMutation(
    session.user.id,
    "pitch_scenario.created",
    "pitch_scenario_template",
    created.id,
    { slug: parsed.data.slug },
    session.tenantId,
  );

  return NextResponse.json({ success: true });
}
