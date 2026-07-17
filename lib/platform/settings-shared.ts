export type FeatureFlagCategory =
  | "workspace"
  | "manager"
  | "readiness"
  | "practice"
  | "integrations"
  | "admin";

export type PlatformFeatureFlagDef = {
  id: string;
  label: string;
  description: string;
  category: FeatureFlagCategory;
  defaultEnabled: boolean;
  /** Route prefixes blocked when disabled (middleware + nav). */
  routePrefixes?: string[];
  /** Manager portal section ids gated by this flag. */
  managerSections?: string[];
  /** Parent flags that must be on for this flag to be effective. */
  dependsOn?: string[];
  /** product = sellable module; ops = kill-switch / integration. */
  kind?: "product" | "ops";
};

/**
 * Entitlement catalog — super-admin toggles per tenant.
 * When disabled: nav hidden, middleware blocks matching routes (and parents gate children).
 */
export const PLATFORM_FEATURE_FLAG_DEFS: PlatformFeatureFlagDef[] = [
  // ── SE Workspace ─────────────────────────────────────────────
  {
    id: "workspace-dashboard",
    label: "My Workspace",
    description: "SE home dashboard and activity hub.",
    category: "workspace",
    defaultEnabled: true,
    kind: "product",
    routePrefixes: ["/dashboard"],
  },
  {
    id: "ramp-plans",
    label: "Ramp plans",
    description: "Onboarding ramp plans, plan steps, and my-plan views.",
    category: "workspace",
    defaultEnabled: true,
    kind: "product",
    routePrefixes: ["/my-plan", "/plan-steps"],
  },
  {
    id: "growth-feedback",
    label: "Growth & feedback",
    description: "Career growth dashboard and personal feedback history.",
    category: "workspace",
    defaultEnabled: true,
    kind: "product",
    routePrefixes: ["/growth", "/feedback"],
  },

  // ── Manager ──────────────────────────────────────────────────
  {
    id: "manager-portal",
    label: "Manager core",
    description: "Command center, inbox, roster — base manager shell.",
    category: "manager",
    defaultEnabled: true,
    kind: "product",
    routePrefixes: ["/manager"],
    managerSections: ["command", "inbox", "roster"],
  },
  {
    id: "coaching-cadence",
    label: "Coaching cadence",
    description: "1:1 cadence, mentees, and review history.",
    category: "manager",
    defaultEnabled: true,
    kind: "product",
    dependsOn: ["manager-portal"],
    managerSections: ["cadence", "mentees", "history"],
  },
  {
    id: "readiness-map",
    label: "Readiness map",
    description: "Team readiness heatmap and field readiness view.",
    category: "manager",
    defaultEnabled: true,
    kind: "product",
    dependsOn: ["manager-portal"],
    managerSections: ["readiness"],
  },
  {
    id: "leaderboard",
    label: "Leaderboard",
    description: "Team leaderboard on the manager portal.",
    category: "manager",
    defaultEnabled: true,
    kind: "product",
    dependsOn: ["manager-portal"],
    managerSections: ["leaderboard"],
  },
  {
    id: "program-tracker",
    label: "Program tracker",
    description: "Cohort / program status tracking for managers.",
    category: "manager",
    defaultEnabled: true,
    kind: "product",
    dependsOn: ["manager-portal"],
    managerSections: ["program"],
  },
  {
    id: "assign-plans",
    label: "Assign plans",
    description: "Assign ramp plans to SEs.",
    category: "manager",
    defaultEnabled: true,
    kind: "product",
    dependsOn: ["manager-portal"],
    routePrefixes: ["/plans"],
    managerSections: ["assign"],
  },
  {
    id: "plan-calendar",
    label: "Plan calendar",
    description: "Visual ramp plan calendar (timeline, month, team).",
    category: "manager",
    defaultEnabled: true,
    kind: "product",
    dependsOn: ["manager-portal"],
    routePrefixes: ["/plan-calendar"],
  },
  {
    id: "manager-dev",
    label: "Team development",
    description: "Manager view of SE development plans.",
    category: "manager",
    defaultEnabled: true,
    kind: "product",
    dependsOn: ["manager-portal", "development"],
    managerSections: ["dev"],
  },

  // ── Readiness ────────────────────────────────────────────────
  {
    id: "learn",
    label: "Learn",
    description: "Structured learning modules and progress tracking.",
    category: "readiness",
    defaultEnabled: true,
    kind: "product",
    routePrefixes: ["/learn"],
  },
  {
    id: "isc-lab",
    label: "ISC Lab",
    description: "ISC Lab scenarios and competency-linked assessments.",
    category: "readiness",
    defaultEnabled: true,
    kind: "product",
    routePrefixes: ["/lab", "/api/ai/isc-lab", "/api/isc-lab"],
  },
  {
    id: "development",
    label: "Development plans",
    description: "Annual development goals and quarterly attestation.",
    category: "readiness",
    defaultEnabled: true,
    kind: "product",
    routePrefixes: ["/development", "/growth-plan"],
  },
  {
    id: "certifications",
    label: "Certifications",
    description: "Readiness certification gates and career ladder.",
    category: "readiness",
    defaultEnabled: true,
    kind: "product",
    routePrefixes: ["/certifications"],
  },
  {
    id: "resources",
    label: "Resources",
    description: "Content library and enablement resources.",
    category: "readiness",
    defaultEnabled: true,
    kind: "product",
    routePrefixes: ["/resources"],
  },
  {
    id: "market-pulse",
    label: "Market Pulse",
    description: "Weekly market pulse submissions and team insights.",
    category: "readiness",
    defaultEnabled: true,
    kind: "product",
    routePrefixes: ["/market-pulse"],
  },

  // ── Practice ─────────────────────────────────────────────────
  {
    id: "challenges",
    label: "Challenges",
    description: "Field scenario challenge library and submissions.",
    category: "practice",
    defaultEnabled: true,
    kind: "product",
    routePrefixes: ["/challenges", "/api/challenges"],
  },
  {
    id: "simulations",
    label: "Simulations",
    description: "AI persona role-play and coaching cards.",
    category: "practice",
    defaultEnabled: true,
    kind: "product",
    dependsOn: ["ai-features"],
    routePrefixes: ["/simulations", "/api/simulations"],
  },
  {
    id: "pitch-studio",
    label: "Pitch Studio",
    description: "Video pitch capture, AI scoring, and peer library.",
    category: "practice",
    defaultEnabled: true,
    kind: "product",
    dependsOn: ["ai-features"],
    routePrefixes: ["/pitch", "/api/pitch"],
  },
  {
    id: "deal-prep",
    label: "Deal Prep",
    description: "Deal prep briefs and objection practice.",
    category: "practice",
    defaultEnabled: true,
    kind: "product",
    routePrefixes: ["/prep", "/api/deal-prep"],
  },
  {
    id: "flight-check",
    label: "Flight Check",
    description: "Pre-call flight check assessments.",
    category: "practice",
    defaultEnabled: true,
    kind: "product",
    routePrefixes: ["/flight-check", "/api/assessments/flight-check"],
  },
  {
    id: "agentic-ai-track",
    label: "Agentic AI track",
    description: "Agentic AI onboarding curriculum modules in Learn (content-gated).",
    category: "practice",
    defaultEnabled: false,
    kind: "product",
    dependsOn: ["learn"],
  },

  // ── Admin ────────────────────────────────────────────────────
  {
    id: "tenant-admin-console",
    label: "Tenant admin console",
    description: "In-tenant admin: users, plans, corpus, analytics, settings.",
    category: "admin",
    defaultEnabled: true,
    kind: "product",
    routePrefixes: ["/admin"],
  },

  // ── Ops / integrations ───────────────────────────────────────
  {
    id: "ai-features",
    label: "AI features",
    description: "Master kill switch for AI coaching, sim turns, and generation APIs.",
    category: "integrations",
    defaultEnabled: true,
    kind: "ops",
    routePrefixes: ["/api/ai"],
  },
  {
    id: "gong-integration",
    label: "Gong integration",
    description: "Gong OAuth and call intel in deal prep.",
    category: "integrations",
    defaultEnabled: false,
    kind: "ops",
    dependsOn: ["deal-prep"],
    routePrefixes: ["/api/integrations/gong"],
  },
  {
    id: "buyer-shares",
    label: "Buyer share rooms",
    description: "Shareable buyer-facing content rooms.",
    category: "integrations",
    defaultEnabled: true,
    kind: "ops",
    routePrefixes: ["/api/buyer-shares", "/share"],
  },
];

export type PlatformFeatureFlags = Record<string, boolean>;

export const DEFAULT_SESSION_IDLE_MINUTES = 15;
export const MIN_SESSION_IDLE_MINUTES = 5;
export const MAX_SESSION_IDLE_MINUTES = 1440;
export const DEFAULT_AUDIT_LOG_RETENTION_DAYS = 365;
export const DEFAULT_ACTIVITY_LOG_RETENTION_DAYS = 180;
export const DEFAULT_AI_USAGE_RETENTION_DAYS = 90;
export const MIN_RETENTION_DAYS = 7;
export const MAX_RETENTION_DAYS = 3650;

export function defaultFeatureFlags(): PlatformFeatureFlags {
  return Object.fromEntries(PLATFORM_FEATURE_FLAG_DEFS.map((flag) => [flag.id, flag.defaultEnabled]));
}

export function mergeFeatureFlags(stored: PlatformFeatureFlags | null | undefined): PlatformFeatureFlags {
  const defaults = defaultFeatureFlags();
  if (!stored || typeof stored !== "object") {
    return defaults;
  }
  return { ...defaults, ...stored };
}

/** Effective = stored on AND all dependsOn parents effective. */
export function isFlagEffectivelyEnabled(
  flags: PlatformFeatureFlags,
  flagId: string,
  visiting: Set<string> = new Set(),
): boolean {
  if (visiting.has(flagId)) return false;
  visiting.add(flagId);

  const merged = mergeFeatureFlags(flags);
  if (!merged[flagId]) return false;

  const def = PLATFORM_FEATURE_FLAG_DEFS.find((flag) => flag.id === flagId);
  if (!def?.dependsOn?.length) return true;

  return def.dependsOn.every((parentId) => isFlagEffectivelyEnabled(merged, parentId, visiting));
}

/**
 * When turning a parent off, also turn off children that depend on it.
 * When turning a child on, ensure parents are turned on.
 */
export function applyFlagToggle(
  flags: PlatformFeatureFlags,
  flagId: string,
  enabled: boolean,
): PlatformFeatureFlags {
  const next = mergeFeatureFlags({ ...flags, [flagId]: enabled });

  if (enabled) {
    const def = PLATFORM_FEATURE_FLAG_DEFS.find((flag) => flag.id === flagId);
    for (const parentId of def?.dependsOn ?? []) {
      Object.assign(next, applyFlagToggle(next, parentId, true));
    }
    return next;
  }

  for (const child of PLATFORM_FEATURE_FLAG_DEFS) {
    if (child.dependsOn?.includes(flagId) && next[child.id]) {
      Object.assign(next, applyFlagToggle(next, child.id, false));
    }
  }
  return next;
}

export function sessionIdleMsFromMinutes(minutes: number): number {
  return minutes * 60 * 1000;
}

export function featureFlagsByCategory(): Record<FeatureFlagCategory, PlatformFeatureFlagDef[]> {
  const grouped: Record<FeatureFlagCategory, PlatformFeatureFlagDef[]> = {
    workspace: [],
    manager: [],
    readiness: [],
    practice: [],
    integrations: [],
    admin: [],
  };

  for (const flag of PLATFORM_FEATURE_FLAG_DEFS) {
    grouped[flag.category].push(flag);
  }

  return grouped;
}
