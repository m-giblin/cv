import {
  PLATFORM_FEATURE_FLAG_DEFS,
  isFlagEffectivelyEnabled,
  type PlatformFeatureFlags,
} from "@/lib/platform/settings-shared";

export function isFeatureEnabled(flags: PlatformFeatureFlags, flagId: string): boolean {
  return isFlagEffectivelyEnabled(flags, flagId);
}

export function flagForPathname(pathname: string): string | null {
  const normalized = pathname.split("?")[0] ?? pathname;

  // Prefer the most specific prefix match (longest wins).
  let bestId: string | null = null;
  let bestLen = -1;

  for (const flag of PLATFORM_FEATURE_FLAG_DEFS) {
    if (!flag.routePrefixes?.length) continue;
    for (const prefix of flag.routePrefixes) {
      if (normalized === prefix || normalized.startsWith(`${prefix}/`)) {
        if (prefix.length > bestLen) {
          bestLen = prefix.length;
          bestId = flag.id;
        }
      }
    }
  }

  return bestId;
}

export function isPathAllowedByFeatureFlags(pathname: string, flags: PlatformFeatureFlags): boolean {
  const flagId = flagForPathname(pathname);
  if (!flagId) return true;
  return isFeatureEnabled(flags, flagId);
}

export function isManagerSectionAllowed(section: string, flags: PlatformFeatureFlags): boolean {
  if (!isFeatureEnabled(flags, "manager-portal")) return false;

  // Core sections live on manager-portal itself.
  const coreSections = new Set(
    PLATFORM_FEATURE_FLAG_DEFS.find((flag) => flag.id === "manager-portal")?.managerSections ?? [],
  );
  if (coreSections.has(section)) return true;

  const sectionFlag = PLATFORM_FEATURE_FLAG_DEFS.find(
    (flag) => flag.id !== "manager-portal" && flag.managerSections?.includes(section),
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

/** Preview which primary nav destinations stay visible for a flag set. */
export function previewEntitledSurfaces(flags: PlatformFeatureFlags): Array<{
  id: string;
  label: string;
  href: string;
  allowed: boolean;
}> {
  const samples = [
    { id: "dashboard", label: "My Workspace", href: "/dashboard" },
    { id: "learn", label: "Learn", href: "/learn" },
    { id: "challenges", label: "Challenges", href: "/challenges" },
    { id: "simulations", label: "Simulations", href: "/simulations" },
    { id: "manager-command", label: "Manager · Command", href: "/manager?section=command" },
    { id: "manager-cadence", label: "Manager · Cadence", href: "/manager?section=cadence" },
    { id: "manager-readiness", label: "Manager · Readiness", href: "/manager?section=readiness" },
    { id: "manager-program", label: "Manager · Program", href: "/manager?section=program" },
    { id: "manager-assign", label: "Manager · Assign", href: "/manager?section=assign" },
    { id: "plan-calendar", label: "Plan calendar", href: "/plan-calendar" },
    { id: "admin", label: "Tenant admin", href: "/admin" },
  ];

  return samples.map((sample) => ({
    ...sample,
    allowed: filterNavHref(sample.href, flags),
  }));
}

export const FEATURE_FLAG_CATEGORY_LABELS: Record<string, string> = {
  workspace: "SE Workspace",
  manager: "Manager modules",
  readiness: "Readiness & learn",
  practice: "Practice tools",
  integrations: "Ops & integrations",
  admin: "Tenant admin",
};
