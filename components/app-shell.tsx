import { cookies, headers } from "next/headers";
import { ReactNode } from "react";
import { AppShellView } from "@/components/app-shell-view";
import type { SidebarPerson } from "@/components/nav/app-sidebar";
import { getEffectiveAccess } from "@/lib/auth/effective-access";
import { SHADOW_CEILING_COOKIE, parseShadowMode } from "@/lib/auth/shadow-tenant";
import {
  WORKSPACE_HAT_COOKIE,
  resolveActiveWorkspace,
  resolveSessionWorkspaceHats,
} from "@/lib/auth/workspace";
import { isForgeConfigured } from "@/lib/forge/config";
import { getTenantShellBranding } from "@/lib/tenant/shell-branding";
import { createClient } from "@/lib/supabase/server";
import { Notification, Profile } from "@/lib/types";

/** Manager and mentor for the SE sidebar "Team" group. Best effort: failures just hide the group. */
async function loadSeTeam(currentUser: Profile): Promise<SidebarPerson[]> {
  try {
    const supabase = await createClient();
    if (!supabase) return [];
    const { data: assignment } = await supabase
      .from("plan_assignments")
      .select("mentor_id")
      .eq("user_id", currentUser.id)
      .not("mentor_id", "is", null)
      .limit(1)
      .maybeSingle();
    const ids = [currentUser.managerId, assignment?.mentor_id].filter((id): id is string => Boolean(id));
    if (ids.length === 0) return [];
    const { data: rows } = await supabase.from("profiles").select("id, full_name").in("id", ids);
    const name = (id: string | null | undefined) => rows?.find((row) => row.id === id)?.full_name;
    const people: SidebarPerson[] = [];
    const manager = name(currentUser.managerId);
    if (manager && currentUser.managerId) people.push({ id: currentUser.managerId, name: manager, role: "manager" });
    const mentorId = assignment?.mentor_id;
    const mentor = name(mentorId);
    if (mentor && mentorId && mentorId !== currentUser.managerId) people.push({ id: mentorId, name: mentor, role: "mentor" });
    return people;
  } catch {
    return [];
  }
}

export async function AppShell({
  children,
  currentUser,
  notifications,
  contentWidth = "default",
}: {
  children: ReactNode;
  currentUser: Profile;
  notifications: Notification[];
  contentWidth?: "default" | "wide" | "full";
}) {
  const access = await getEffectiveAccess(currentUser.role, currentUser.tenantId ?? null);
  const brandingTenantId = access.isShadowing
    ? access.tenantId
    : (currentUser.tenantId ?? access.tenantId);
  const branding = await getTenantShellBranding(brandingTenantId);

  const cookieStore = await cookies();
  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname");
  const enterMode = access.isShadowing ? (access.shadowMode ?? "admin") : null;
  const enterCeiling = access.isShadowing
    ? parseShadowMode(cookieStore.get(SHADOW_CEILING_COOKIE)?.value ?? enterMode)
    : null;
  const hats = resolveSessionWorkspaceHats(currentUser.role, currentUser.workspaceHats ?? null, {
    enteredTenant: access.isShadowing,
    enterMode: enterCeiling,
  });
  const workspace = resolveActiveWorkspace({
    hats,
    cookieValue: cookieStore.get(WORKSPACE_HAT_COOKIE)?.value ?? null,
    pathname,
    shadowMode: enterMode,
  });

  const people = workspace === "se" ? await loadSeTeam(currentUser) : undefined;

  return (
    <AppShellView
      branding={branding}
      contentWidth={contentWidth}
      currentUser={currentUser}
      forgeEnabled={isForgeConfigured()}
      notifications={notifications}
      people={people}
      shadowMode={access.isShadowing ? (access.shadowMode ?? "admin") : null}
      shadowTenantName={
        access.isShadowing ? (access.shadowTenantName ?? branding.productName) : null
      }
      tier={access.tier}
      workspace={workspace}
      workspaceHats={hats}
    >
      {children}
    </AppShellView>
  );
}
