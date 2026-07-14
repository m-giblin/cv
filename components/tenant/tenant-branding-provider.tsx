"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { TenantShellBranding } from "@/lib/tenant/shell-branding-shared";
import { DEFAULT_SHELL_BRANDING } from "@/lib/tenant/shell-branding-shared";

const TenantBrandingContext = createContext<TenantShellBranding>(DEFAULT_SHELL_BRANDING);

export function TenantBrandingProvider({
 branding,
 children,
}: {
 branding: TenantShellBranding;
 children: ReactNode;
}) {
 return <TenantBrandingContext.Provider value={branding}>{children}</TenantBrandingContext.Provider>;
}

export function useTenantBranding() {
 return useContext(TenantBrandingContext);
}
