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
  /** Manager portal section id when disabled. */
  managerSection?: string;
};

/**
 * Entitlement catalog — super-admin toggles per tenant.
 * When disabled: nav hidden, middleware blocks matching routes.
 */
export const PLATFORM_FEATURE_FLAG_DEFS: PlatformFeatureFlagDef[] = [
  // Workspace (SE core — usually always on)
  {
    id: "workspace-dashboard",
    label: "My Workspace",
    description: "SE home dashboard and activity hub.",
    category: "workspace",
    defaultEnabled: true,
    routePrefixes: ["/dashboard"],
  },
  {
    id: "ramp-plans",
    label: "Ramp plans",
    description: "Onboarding ramp plans, plan steps, and my-plan views.",
    category: "workspace",
    defaultEnabled: true,
    routePrefixes: ["/my-plan", "/plan-steps"],
  },
  {
    id: "growth-feedback",
    label: "Growth & feedback",
    description: "Career growth dashboard and personal feedback history.",
    category: "workspace",
    defaultEnabled: true,
    routePrefixes: ["/growth", "/feedback"],
  },
  // Manager portal
  {
    id: "manager-portal",
    label: "Manager portal",
    description: "Command center, inbox, roster, and coaching tools.",
    category: "manager",
    defaultEnabled: true,
    routePrefixes: ["/manager"],
  },
  {
    id: "leaderboard",
    label: "Leaderboard",
    description: "Team leaderboard on the manager command center.",
    category: "manager",
    defaultEnabled: true,
    routePrefixes: ["/manager"],
    managerSection: "leaderboard",
  },
  {
    id: "program-tracker",
    label: "Program tracker",
    description: "Manager Program Tracker section (program status and cohort view).",
    category: "manager",
    defaultEnabled: true,
    routePrefixes: ["/manager"],
    managerSection: "program",
  },
  {
    id: "assign-plans",
    label: "Assign plans",
    description: "Manager Assign Plans workflow for ramp plan assignments.",
    category: "manager",
    defaultEnabled: true,
    routePrefixes: ["/manager", "/plans"],
    managerSection: "assign",
  },
  {
    id: "plan-calendar",
    label: "Plan calendar",
    description: "Visual ramp plan calendar with timeline, month, and week views.",
    category: "manager",
    defaultEnabled: true,
    routePrefixes: ["/plan-calendar"],
  },
  // Readiness
  {
    id: "learn",
    label: "Learn",
    description: "Structured learning modules and progress tracking.",
    category: "readiness",
    defaultEnabled: true,
    routePrefixes: ["/learn"],
  },
  {
    id: "isc-lab",
    label: "ISC Lab",
    description: "ISC Lab scenarios and competency-linked assessments.",
    category: "readiness",
    defaultEnabled: true,
    routePrefixes: ["/lab", "/api/ai/isc-lab", "/api/isc-lab"],
  },
  {
    id: "development",
    label: "Development plans",
    description: "Annual development goals and quarterly attestation.",
    category: "readiness",
    defaultEnabled: true,
    routePrefixes: ["/development", "/growth-plan"],
  },
  {
    id: "certifications",
    label: "Certifications",
    description: "Readiness certification gates and career ladder.",
    category: "readiness",
    defaultEnabled: true,
    routePrefixes: ["/certifications"],
  },
  {
    id: "resources",
    label: "Resources",
    description: "Content library and enablement resources.",
    category: "readiness",
    defaultEnabled: true,
    routePrefixes: ["/resources"],
  },
  {
    id: "market-pulse",
    label: "Market Pulse",
    description: "Weekly market pulse submissions and team insights.",
    category: "readiness",
    defaultEnabled: true,
    routePrefixes: ["/market-pulse"],
  },
  // Practice
  {
    id: "challenges",
    label: "Challenges",
    description: "Field scenario challenge library and submissions.",
    category: "practice",
    defaultEnabled: true,
    routePrefixes: ["/challenges", "/api/challenges"],
  },
  {
    id: "simulations",
    label: "Simulations",
    description: "AI persona role-play and coaching cards.",
    category: "practice",
    defaultEnabled: true,
    routePrefixes: ["/simulations", "/api/simulations"],
  },
  {
    id: "pitch-studio",
    label: "Pitch Studio",
    description: "Video pitch capture, AI scoring, and peer library.",
    category: "practice",
    defaultEnabled: true,
    routePrefixes: ["/pitch", "/api/pitch"],
  },
  {
    id: "deal-prep",
    label: "Deal Prep",
    description: "Deal prep briefs and objection practice.",
    category: "practice",
    defaultEnabled: true,
    routePrefixes: ["/prep", "/api/deal-prep"],
  },
  {
    id: "flight-check",
    label: "Flight Check",
    description: "Pre-call flight check assessments.",
    category: "practice",
    defaultEnabled: true,
    routePrefixes: ["/flight-check", "/api/assessments/flight-check"],
  },
  {
    id: "agentic-ai-track",
    label: "Agentic AI track",
    description: "Agentic AI onboarding track in plan templates and analytics.",
    category: "practice",
    defaultEnabled: false,
  },
  // Admin / platform
  {
    id: "tenant-admin-console",
    label: "Tenant admin console",
    description: "In-tenant admin: users, plans, corpus, analytics.",
    category: "admin",
    defaultEnabled: true,
    routePrefixes: ["/admin"],
  },
  {
    id: "ai-features",
    label: "AI features",
    description: "AI coaching, deal prep generation, challenge AI, and sim turns.",
    category: "integrations",
    defaultEnabled: true,
    routePrefixes: ["/api/ai"],
  },
  {
    id: "gong-integration",
    label: "Gong integration",
    description: "Gong OAuth and call intel in deal prep.",
    category: "integrations",
    defaultEnabled: false,
    routePrefixes: ["/api/integrations/gong"],
  },
  {
    id: "buyer-shares",
    label: "Buyer share rooms",
    description: "Shareable buyer-facing content rooms.",
    category: "integrations",
    defaultEnabled: true,
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
