import {
  PLATFORM_FEATURE_FLAG_DEFS,
  mergeFeatureFlags,
  type PlatformFeatureFlags,
} from "@/lib/platform/settings-shared";

export function isFeatureEnabled(flags: PlatformFeatureFlags, flagId: string): boolean {
  const merged = mergeFeatureFlags(flags);
  return merged[flagId] ?? true;
}

export function flagForPathname(pathname: string): string | null {
  const normalized = pathname.split("?")[0] ?? pathname;

  for (const flag of PLATFORM_FEATURE_FLAG_DEFS) {
    if (!flag.routePrefixes?.length) continue;
    for (const prefix of flag.routePrefixes) {
      if (normalized === prefix || normalized.startsWith(`${prefix}/`)) {
        return flag.id;
      }
    }
  }

  return null;
}

export function isPathAllowedByFeatureFlags(pathname: string, flags: PlatformFeatureFlags): boolean {
  const flagId = flagForPathname(pathname);
  if (!flagId) return true;
  return isFeatureEnabled(flags, flagId);
}

export function isManagerSectionAllowed(section: string, flags: PlatformFeatureFlags): boolean {
  if (!isFeatureEnabled(flags, "manager-portal")) return false;

  const sectionFlag = PLATFORM_FEATURE_FLAG_DEFS.find(
    (flag) => flag.managerSection === section && flag.id !== "manager-portal",
  );
  if (!sectionFlag) return true;
  return isFeatureEnabled(flags, sectionFlag.id);
}

export function filterNavHref(href: string, flags: PlatformFeatureFlags): boolean {
  const base = href.split("?")[0] ?? href;

  if (base === "/manager" || href.startsWith("/manager?")) {
    const params = new URLSearchParams(href.split("?")[1] ?? "");
    const section = params.get("section") ?? "command";
    return isManagerSectionAllowed(section, flags);
  }

  return isPathAllowedByFeatureFlags(base, flags);
}

export const FEATURE_FLAG_CATEGORY_LABELS: Record<string, string> = {
  workspace: "Workspace",
  manager: "Manager portal",
  readiness: "Readiness",
  practice: "Practice",
  integrations: "Integrations & AI",
  admin: "Admin",
};
