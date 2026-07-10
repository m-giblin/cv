export const DEFAULT_TENANT_ID = "00000000-0000-4000-8000-000000000001";

export type TenantStatus = "active" | "suspended" | "provisioning";

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
