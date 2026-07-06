export const DEFAULT_SESSION_IDLE_MINUTES = 15;
export const MIN_SESSION_IDLE_MINUTES = 5;
export const MAX_SESSION_IDLE_MINUTES = 1440;

export type PlatformFeatureFlagDef = {
  id: string;
  label: string;
  description: string;
  defaultEnabled: boolean;
};

export const PLATFORM_FEATURE_FLAG_DEFS: PlatformFeatureFlagDef[] = [
  {
    id: "northstar-admin-ui",
    label: "Northstar Admin UI",
    description: "Enable new admin visual experience for all admin users.",
    defaultEnabled: true,
  },
  {
    id: "agentic-ai-track",
    label: "Agentic AI Track",
    description: "Expose Agentic AI onboarding track in plan templates and analytics.",
    defaultEnabled: false,
  },
  {
    id: "pitch-studio",
    label: "Pitch Studio",
    description: "Enable Pitch Studio practice mode in simulation workflows.",
    defaultEnabled: true,
  },
  {
    id: "isc-lab",
    label: "ISC Lab",
    description: "Enable ISC Lab scenarios and competency-linked assessments.",
    defaultEnabled: true,
  },
  {
    id: "leaderboard",
    label: "Leaderboard",
    description: "Show team leaderboard rankings on manager command center.",
    defaultEnabled: true,
  },
];

export const DEFAULT_AUDIT_LOG_RETENTION_DAYS = 365;
export const DEFAULT_ACTIVITY_LOG_RETENTION_DAYS = 180;
export const DEFAULT_AI_USAGE_RETENTION_DAYS = 90;

export const MIN_RETENTION_DAYS = 7;
export const MAX_RETENTION_DAYS = 3650;

export type PlatformFeatureFlags = Record<string, boolean>;

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
