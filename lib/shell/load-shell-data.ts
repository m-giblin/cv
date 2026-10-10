import { cache } from "react";
import { cookies } from "next/headers";
import type { SidebarPerson } from "@/components/nav/app-sidebar";
import { getEffectiveAccess } from "@/lib/auth/effective-access";
import { SHADOW_CEILING_COOKIE, parseShadowMode } from "@/lib/auth/shadow-tenant";
import { WORKSPACE_HAT_COOKIE, resolveSessionWorkspaceHats, type WorkspaceHat } from "@/lib/auth/workspace";
import { getAuthenticatedUser } from "@/lib/data/get-authenticated-user";
import { isForgeConfigured } from "@/lib/forge/config";
import { isFeatureEnabled } from "@/lib/platform/feature-flags";
import { loadPlatformSettings } from "@/lib/platform/settings";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";
import { createClient } from "@/lib/supabase/server";
import { getTenantShellBranding, type TenantShellBranding } from "@/lib/tenant/shell-branding";
import type { Notification, Profile, ProfileRole, SeLevel } from "@/lib/types";

export type ShellData = {
  currentUser: Profile;
  notifications: Notification[];
  branding: TenantShellBranding;
  workspaceHats: WorkspaceHat[];
  workspaceCookie: string | null;
  shadowMode: "admin" | "manager" | "se" | null;
  shadowTenantName: string | null;
  people: SidebarPerson[];
  /** Active mentees this person mentors; the Mentoring nav item only shows when this is above zero. */
  menteeCount: number;
  forgeEnabled: boolean;
  /** AI assistant switched on for this tenant (operator flag plus the AI master switch). */
  assistantEnabled: boolean;
};

type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  role: ProfileRole;
  level: SeLevel;
  manager_id: string | null;
  tenant_id: string | null;
  avatar_url: string | null;
  workspace_hats: string[] | null;
  created_at: string;
};

/** How many people this user is currently mentoring. Best effort: 0 on any failure. */
async function countMentees(userId: string) {
  try {
    const admin = getTenantAdminClient();
    if (!admin) return 0;
    const { count } = await admin
      .from("plan_assignments")
      .select("id", { count: "exact", head: true })
      .eq("mentor_id", userId)
      .neq("status", "completed");
    return count ?? 0;
  } catch {
    return 0;
  }
}

/** Manager and mentor for the SE sidebar "Team" group. Best effort: failures just hide the group. */
async function loadSeTeam(supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>, user: Profile) {
  try {
    const { data: assignment } = await supabase
      .from("plan_assignments")
      .select("mentor_id")
      .eq("user_id", user.id)
      .not("mentor_id", "is", null)
      .limit(1)
      .maybeSingle();
    const ids = [user.managerId, assignment?.mentor_id].filter((id): id is string => Boolean(id));
    if (ids.length === 0) return [];
    const { data: rows } = await supabase.from("profiles").select("id, full_name").in("id", ids);
    const name = (id: string | null | undefined) => rows?.find((row) => row.id === id)?.full_name;
    const people: SidebarPerson[] = [];
    const manager = name(user.managerId);
    if (manager && user.managerId) people.push({ id: user.managerId, name: manager, role: "manager" });
    const mentorId = assignment?.mentor_id;
    const mentor = name(mentorId);
    if (mentor && mentorId && mentorId !== user.managerId) people.push({ id: mentorId, name: mentor, role: "mentor" });
    return people;
  } catch {
    return [];
  }
}

/**
 * Everything the persistent app shell needs, loaded once by the (app) layout. Client navigation
 * keeps the layout mounted, so these queries no longer run on every click; the workspace and
 * content width are worked out on the client from the URL.
 */
export const loadShellData = cache(async (): Promise<ShellData | null> => {
  const supabase = await createClient();
  if (!supabase) return null;

  const user = await getAuthenticatedUser();
  if (!user) return null;

  const [profileResult, notificationsResult, cookieStore] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, role, level, manager_id, tenant_id, avatar_url, workspace_hats, created_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("notifications")
      .select("id, user_id, title, body, action_url, read_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    cookies(),
  ]);

  const row = profileResult.data as ProfileRow | null;
  if (!row) return null;

  const currentUser: Profile = {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    level: row.level,
    managerId: row.manager_id,
    tenantId: row.tenant_id,
    avatarUrl: row.avatar_url,
    workspaceHats: row.workspace_hats ?? null,
    createdAt: row.created_at,
  };

  const access = await getEffectiveAccess(currentUser.role, currentUser.tenantId ?? null);
  const enterMode = access.isShadowing ? (access.shadowMode ?? "admin") : null;
  const enterCeiling = access.isShadowing
    ? parseShadowMode(cookieStore.get(SHADOW_CEILING_COOKIE)?.value ?? enterMode)
    : null;
  const workspaceHats = resolveSessionWorkspaceHats(currentUser.role, currentUser.workspaceHats ?? null, {
    enteredTenant: access.isShadowing,
    enterMode: enterCeiling,
  });
  const brandingTenantId = access.isShadowing ? access.tenantId : (currentUser.tenantId ?? access.tenantId);

  const [branding, people, menteeCount, settings] = await Promise.all([
    getTenantShellBranding(brandingTenantId),
    workspaceHats.includes("se") ? loadSeTeam(supabase, currentUser) : Promise.resolve([]),
    workspaceHats.includes("se") ? countMentees(currentUser.id) : Promise.resolve(0),
    loadPlatformSettings(brandingTenantId ?? undefined).catch(() => null),
  ]);
  const assistantEnabled = Boolean(
    settings &&
      isFeatureEnabled(settings.featureFlags, "ai-features") &&
      isFeatureEnabled(settings.featureFlags, "ai-assistant"),
  );

  const notifications: Notification[] = (notificationsResult.data ?? []).map((item) => ({
    id: item.id,
    userId: item.user_id,
    title: item.title,
    body: item.body,
    actionUrl: item.action_url ?? null,
    readAt: item.read_at,
    createdAt: item.created_at,
  }));

  return {
    currentUser,
    notifications,
    branding,
    workspaceHats,
    workspaceCookie: cookieStore.get(WORKSPACE_HAT_COOKIE)?.value ?? null,
    shadowMode: enterMode,
    shadowTenantName: access.isShadowing ? (access.shadowTenantName ?? branding.productName) : null,
    people,
    menteeCount,
    forgeEnabled: isForgeConfigured(),
    assistantEnabled,
  };
});
