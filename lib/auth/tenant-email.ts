import { ALLOWED_EMAIL_DOMAINS, isAllowedEmail } from "@/lib/auth/email-domain";
import { getTenantAdminClient } from "@/lib/data/tenant-scoped-query";

export function emailDomain(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.lastIndexOf("@");
  if (atIndex <= 0) {
    return null;
  }
  return normalized.slice(atIndex + 1);
}

export function isEmailDomainAllowedForTenant(email: string, tenantDomains: string[]): boolean {
  const domain = emailDomain(email);
  if (!domain) {
    return false;
  }

  const allowed = tenantDomains.map((value) => value.trim().toLowerCase()).filter(Boolean);
  if (allowed.length > 0) {
    return allowed.includes(domain);
  }

  return isAllowedEmail(email);
}

export async function loadTenantAllowedEmailDomains(tenantId: string): Promise<string[]> {
  const admin = getTenantAdminClient();
  if (!admin) {
    return [];
  }

  const { data } = await admin
    .from("tenants")
    .select("allowed_email_domains")
    .eq("id", tenantId)
    .maybeSingle();

  const domains = (data as { allowed_email_domains?: unknown } | null)?.allowed_email_domains;
  return Array.isArray(domains) ? domains.filter((value): value is string => typeof value === "string") : [];
}

// Sign-in domains change rarely; middleware checks them on every request, so keep them briefly.
const DOMAIN_CACHE_TTL = 30_000;
const domainCache = new Map<string, { value: string[]; loadedAt: number }>();

async function loadTenantAllowedEmailDomainsCached(tenantId: string): Promise<string[]> {
  const cached = domainCache.get(tenantId);
  if (cached && Date.now() - cached.loadedAt < DOMAIN_CACHE_TTL) return cached.value;
  const value = await loadTenantAllowedEmailDomains(tenantId);
  domainCache.set(tenantId, { value, loadedAt: Date.now() });
  return value;
}

export async function validateEmailForTenant(
  email: string,
  tenantId: string,
  loadDomains: (tenantId: string) => Promise<string[]> = loadTenantAllowedEmailDomains,
): Promise<string | null> {
  const domains = await loadDomains(tenantId);
  if (!isEmailDomainAllowedForTenant(email, domains)) {
    const label =
      domains.length > 0
        ? domains.map((domain) => `@${domain}`).join(" or ")
        : ALLOWED_EMAIL_DOMAINS.map((domain) => `@${domain}`).join(" or ");
    return `Email must use an allowed domain for this tenant (${label}).`;
  }

  return null;
}

export async function validateProfileTenantEmail(
  email: string,
  profileTenantId: string | null,
): Promise<string | null> {
  if (!profileTenantId) {
    return isAllowedEmail(email) ? null : `Only platform-approved email domains can sign in.`;
  }

  return validateEmailForTenant(email, profileTenantId, loadTenantAllowedEmailDomainsCached);
}
