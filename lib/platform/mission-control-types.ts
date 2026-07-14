import type { SupportRequest, TenantHealth } from "@/lib/tenant/types";

export type MissionControlNow = {
  summary: {
    tenantCount: number;
    openTickets: number;
    criticalTickets: number;
    slaBreached: number;
    tenantsNeedingAttention: number;
    activeShadowSessions: number;
    maintenanceTenants: number;
  };
  criticalTickets: Array<SupportRequest & { slaLabel: string; slaBreached: boolean }>;
  recentAlerts: TenantHealth[];
  maintenanceTenants: Array<{ tenantId: string; name: string; message: string | null }>;
};

export type OnboardingStage =
  | "created"
  | "admin_invited"
  | "admin_accepted"
  | "has_users"
  | "first_activity";

export type OnboardingFunnelEntry = {
  tenantId: string;
  slug: string;
  name: string;
  status: string;
  stage: OnboardingStage;
  stageIndex: number;
  createdAt: string;
  adminInviteStatus: "none" | "pending" | "accepted";
  userCount: number;
  hasActivity: boolean;
};

export type ShadowSession = {
  id: string;
  actorId: string;
  actorName: string | null;
  tenantId: string | null;
  tenantName: string | null;
  mode: string | null;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number | null;
  active: boolean;
};

export type OperatorDigestEntry = {
  id: string;
  tenantId: string | null;
  actorId: string | null;
  actorName: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
  hoursAgo: number;
};

export type MissionControlBundle = {
  now: MissionControlNow;
  onboarding: OnboardingFunnelEntry[];
  shadowSessions: ShadowSession[];
  digest: OperatorDigestEntry[];
  health: TenantHealth[];
  operators: Array<{ id: string; fullName: string; email: string }>;
};

export const ONBOARDING_STAGE_LABELS: Record<OnboardingStage, string> = {
  created: "Created",
  admin_invited: "Admin invited",
  admin_accepted: "Admin accepted",
  has_users: "Has users",
  first_activity: "First activity",
};
