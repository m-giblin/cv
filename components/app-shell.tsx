import { ReactNode } from "react";
import { AppShellView } from "@/components/app-shell-view";
import { getEffectiveAccess } from "@/lib/auth/effective-access";
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
  const brandingTenantId = access.isShadowing ? access.tenantId : (currentUser.tenantId ?? access.tenantId);
  const branding = await getTenantShellBranding(brandingTenantId);

  return (
    <AppShellView
      branding={branding}
      contentWidth={contentWidth}
      currentUser={currentUser}
      notifications={notifications}
      shadowMode={access.isShadowing ? (access.shadowMode ?? "admin") : null}
      shadowTenantName={access.isShadowing ? (access.shadowTenantName ?? branding.productName) : null}
      tier={access.tier}
    >
      {children}
    </AppShellView>
  );
}
