export const DEFAULT_TENANT_ID = "00000000-0000-4000-8000-000000000001";

export type TenantStatus = "active" | "suspended" | "provisioning";

export type TenantBillingStatus = "trial" | "active" | "past_due" | "canceled" | "exempt";
export type TenantCustomDomainStatus = "none" | "pending" | "verified" | "failed";
export type TenantExportStatus = "idle" | "queued" | "running" | "ready" | "failed";

export type TenantBranding = {
  primaryColor: string;
  logoUrl: string | null;
  welcomeMessage: string | null;
  allowedEmailDomains: string[];
};

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  status: TenantStatus;
  branding: TenantBranding;
  operatorNotes: string | null;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  billingStatus: TenantBillingStatus;
  billingPlan: string | null;
  seatQuota: number | null;
  customDomain: string | null;
  customDomainStatus: TenantCustomDomainStatus;
  exportRequestedAt: string | null;
  exportCompletedAt: string | null;
  exportStatus: TenantExportStatus;
  lastExportArtifactUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TenantAdminInvite = {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  status: "pending" | "accepted" | "revoked";
  createdAt: string;
  acceptedAt: string | null;
  lastSentAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
};

export type TenantUsageDaily = {
  id: string;
  tenantId: string;
  usageDate: string;
  activeUsers: number;
  aiCalls: number;
  simulationSessions: number;
  challengeSubmissions: number;
  storageBytes: number;
};

export type PlatformAuditEntry = {
  id: string;
  tenantId: string | null;
  tenantName?: string | null;
  actorId: string | null;
  actorName: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
};

export type SupportPriority = "low" | "medium" | "high" | "critical";
export type SupportStatus = "open" | "in_progress" | "resolved" | "closed";

export type SupportRequest = {
  id: string;
  tenantId: string;
  tenantName?: string;
  reporterId: string;
  reporterName?: string | null;
  reporterEmail?: string | null;
  subject: string;
  body: string;
  priority: SupportPriority;
  status: SupportStatus;
  pageUrl: string | null;
  operatorNotes: string | null;
  operatorReply: string | null;
  assignedTo: string | null;
  assignedToName?: string | null;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TenantSsoProvider = "saml" | "oidc";

export type TenantSsoConfig = {
  tenantId: string;
  enabled: boolean;
  provider: TenantSsoProvider;
  ssoDomain: string | null;
  metadata: Record<string, unknown>;
  updatedAt: string;
};

export type TenantWebhook = {
  id: string;
  tenantId: string;
  url: string;
  hasSecret: boolean;
  events: string[];
  enabled: boolean;
  createdAt: string;
};

export type OperatorNotificationPrefs = {
  userId: string;
  emailOnCriticalSupport: boolean;
  emailOnNewTenant: boolean;
  emailDigestHours: number;
  channels: Record<string, unknown>;
  updatedAt: string;
};

export type TenantUsageFleetRow = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  status: TenantStatus;
  activeUsers: number;
  aiCalls30d: number;
  simulationSessions30d: number;
  seatQuota: number | null;
  billingStatus: TenantBillingStatus;
};

export type TenantUsageFleet = {
  totals: {
    tenantCount: number;
    totalUsers: number;
    aiCalls30d: number;
    simulationSessions30d: number;
  };
  tenants: TenantUsageFleetRow[];
};

export type TenantHealth = {
  tenantId: string;
  slug: string;
  name: string;
  status: TenantStatus;
  userCount: number;
  hasAdminInvite: boolean;
  hasAcceptedAdmin: boolean;
  openSupportTickets: number;
  flagsCustomized: boolean;
  aiCalls30d: number;
  alerts: string[];
  lastUserActivityAt?: string | null;
  lastAiCallAt?: string | null;
  lastAdminActionAt?: string | null;
  maintenanceMode?: boolean;
};
