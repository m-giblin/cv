import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";
import {
  resolveEffectiveAccess,
  SHADOW_MODE_COOKIE,
  SHADOW_TENANT_COOKIE,
  SHADOW_TENANT_NAME_COOKIE,
} from "@/lib/auth/shadow-tenant";
import {
  buildObjectionPracticePrompt,
  resolveVerticalFromIndustry,
} from "@/lib/simulations/objection-practice-prompt";
import { resolveSimulationStartMessage } from "@/lib/simulations/prompt-template";
import { applySessionTenant } from "@/lib/supabase/tenant-session";
import { DEFAULT_TENANT_ID } from "@/lib/tenant/types";
import type { ProfileRole } from "@/lib/types";

const schema = z.object({
  objection: z.string().min(5),
  accountName: z.string().min(2),
  industry: z.string().min(2),
  solutionFocus: z.preprocess(
    (value) => (typeof value === "string" && value.trim().length < 2 ? undefined : value),
    z.string().min(2).optional(),
  ),
  prepSessionId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const session = await requireAuthenticatedSession();
  if (session instanceof NextResponse) {
    return session;
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: profile } = await session.supabase
    .from("profiles")
    .select("role, tenant_id")
    .eq("id", session.user.id)
    .maybeSingle();

  const profileRole = (profile as { role: ProfileRole; tenant_id: string | null } | null)?.role;
  const profileTenantId =
    (profile as { tenant_id: string | null } | null)?.tenant_id ?? null;

  const cookieStore = await cookies();
  const access = resolveEffectiveAccess(
    profileRole ?? "basic_se",
    profileTenantId,
    cookieStore.get(SHADOW_TENANT_COOKIE)?.value ?? null,
    cookieStore.get(SHADOW_TENANT_NAME_COOKIE)?.value ?? null,
    cookieStore.get(SHADOW_MODE_COOKIE)?.value ?? null,
  );

  if (access.isShadowing && access.actualTier === "super_admin" && access.tenantId) {
    try {
      await applySessionTenant(session.supabase, access.tenantId);
    } catch {
      // App-layer tenant scoping remains the primary guard.
    }
  }

  const tenantId = access.tenantId ?? profileTenantId ?? DEFAULT_TENANT_ID;

  const vertical = resolveVerticalFromIndustry(parsed.data.industry);
  const solutionFocus = parsed.data.solutionFocus ?? "Identity Security Cloud";
  const difficulty = "intermediate" as const;
  const promptBody = buildObjectionPracticePrompt({
    objection: parsed.data.objection,
    accountName: parsed.data.accountName,
    industry: parsed.data.industry,
    vertical,
    solutionFocus,
    difficulty,
  });

  const sessionData = {
    promptSnapshot: promptBody,
    aiRoleplay: true,
    simulationKind: "objection_practice",
    startMessage: resolveSimulationStartMessage(
      `Objection practice — ${parsed.data.accountName}`,
      promptBody,
    ),
    practiceRoundsRequired: 1,
    practiceRoundsCompleted: 0,
    sourcePrepSessionId: parsed.data.prepSessionId ?? null,
    sourceObjection: parsed.data.objection,
  };

  const { data, error } = await session.supabase
    .from("simulation_assignments")
    .insert({
      assigned_to: session.user.id,
      assigned_by: session.user.id,
      persona: "Skeptical buyer (objection practice)",
      vertical,
      solution_focus: solutionFocus,
      difficulty,
      status: "not_started",
      session_data: sessionData,
      tenant_id: tenantId,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    assignmentId: data.id,
    redirectUrl: `/simulations?focus=simulation&assignment=${data.id}`,
  });
}
