import { cookies, headers } from "next/headers";
import { ReactNode } from "react";
import { AppShellView } from "@/components/app-shell-view";
import { getEffectiveAccess } from "@/lib/auth/effective-access";
import { SHADOW_CEILING_COOKIE, parseShadowMode } from "@/lib/auth/shadow-tenant";
import {
  WORKSPACE_HAT_COOKIE,
  resolveActiveWorkspace,
  resolveSessionWorkspaceHats,
} from "@/lib/auth/workspace";
import { isForgeConfigured } from "@/lib/forge/config";
import { getTenantShellBranding } from "@/lib/tenant/shell-branding";
import { Notification, Profile } from "@/lib/types";

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

  return (
    <AppShellView
      branding={branding}
      contentWidth={contentWidth}
      currentUser={currentUser}
      forgeEnabled={isForgeConfigured()}
      notifications={notifications}
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
