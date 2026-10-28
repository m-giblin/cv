import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit/log-admin-action";
import {
  SHADOW_CEILING_COOKIE,
  SHADOW_MODE_COOKIE,
  SHADOW_TENANT_COOKIE,
  SHADOW_TENANT_NAME_COOKIE,
  clearShadowCookiesOnResponse,
  maxShadowMode,
  parseShadowMode,
  shadowCookieOptions,
} from "@/lib/auth/shadow-tenant";
import {
  WORKSPACE_HAT_COOKIE,
  enterModeForWorkspaceHat,
  getWorkspaceHome,
  isWorkspaceHat,
  resolveSessionWorkspaceHats,
} from "@/lib/auth/workspace";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRole } from "@/lib/types";

const schema = z.object({
  hat: z.string(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success || !isWorkspaceHat(parsed.data.hat)) {
    return NextResponse.json({ error: "Invalid workspace." }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, workspace_hats, tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile?.role as ProfileRole | undefined) ?? "basic_se";
  const cookieStore = await cookies();
  const enteredTenant = Boolean(cookieStore.get(SHADOW_TENANT_COOKIE)?.value);
  const ceiling = parseShadowMode(
    cookieStore.get(SHADOW_CEILING_COOKIE)?.value ?? cookieStore.get(SHADOW_MODE_COOKIE)?.value,
  );

  const hats = resolveSessionWorkspaceHats(role, profile?.workspace_hats ?? null, {
    enteredTenant,
    enterMode: enteredTenant ? ceiling : null,
  });

  if (!hats.includes(parsed.data.hat)) {
    // A platform operator who mentors gets the user workspace inside the mentees' tenant; the
    // shell offers it, so send them through the route that enters that tenant.
    if (parsed.data.hat === "se" && !enteredTenant && role === "super_admin" && (await hasMentees(user.id))) {
      return NextResponse.json({ error: "Opening your mentees' workspace.", enter: "/api/platform/mentoring" }, { status: 409 });
    }
    return NextResponse.json({ error: "You do not have that workspace." }, { status: 403 });
  }

  const previousHat = cookieStore.get(WORKSPACE_HAT_COOKIE)?.value ?? null;
  const nextEnterMode = enterModeForWorkspaceHat(parsed.data.hat);
  const exitingTenant = parsed.data.hat === "platform" && enteredTenant;

  const response = NextResponse.json({
    success: true,
    hat: parsed.data.hat,
    home: getWorkspaceHome(parsed.data.hat),
    exitedTenant: exitingTenant,
  });

  if (exitingTenant) {
    clearShadowCookiesOnResponse(response);
  } else if (enteredTenant && nextEnterMode) {
    // Keep the same tenant, change work surface (Admin ↔ Manager ↔ User).
    const options = shadowCookieOptions();
    response.cookies.set(SHADOW_MODE_COOKIE, nextEnterMode, options);
    response.cookies.set(SHADOW_CEILING_COOKIE, maxShadowMode(ceiling, nextEnterMode), options);
  }

  response.cookies.set(WORKSPACE_HAT_COOKIE, parsed.data.hat, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 180,
  });

  if (previousHat !== parsed.data.hat) {
    void logAuditEvent(user.id, {
      action: "workspace.hat_switched",
      targetType: "workspace",
      targetId: user.id,
      tenantId: (profile as { tenant_id?: string | null } | null)?.tenant_id ?? null,
      details: {
        from: previousHat,
        to: parsed.data.hat,
        exitedTenant: exitingTenant,
        enterMode: nextEnterMode,
        tenantName: cookieStore.get(SHADOW_TENANT_NAME_COOKIE)?.value ?? null,
      },
    });
  }

  return response;
}

async function hasMentees(userId: string) {
  const admin = createAdminClient();
  if (!admin) return false;
  const { count } = await admin
    .from("plan_assignments")
    .select("id", { count: "exact", head: true })
    .eq("mentor_id", userId)
    .neq("status", "completed");
  return (count ?? 0) > 0;
}
