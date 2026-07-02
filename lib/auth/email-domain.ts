export const ALLOWED_EMAIL_DOMAINS = ["sailpoint.com", "example.com"] as const;

/** Primary domain shown in UI placeholders */
export const ALLOWED_EMAIL_DOMAIN = ALLOWED_EMAIL_DOMAINS[0];

export function allowedEmailDomainsLabel(): string {
  return ALLOWED_EMAIL_DOMAINS.map((domain) => `@${domain}`).join(" or ");
}

export function isAllowedEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.lastIndexOf("@");

  if (atIndex <= 0) {
    return false;
  }

  const domain = normalized.slice(atIndex + 1);
  return ALLOWED_EMAIL_DOMAINS.includes(domain as (typeof ALLOWED_EMAIL_DOMAINS)[number]);
}

export function allowedEmailError(email: string): string | null {
  if (!email.trim()) {
    return "Email is required.";
  }

  if (!isAllowedEmail(email)) {
    return `Only ${allowedEmailDomainsLabel()} email addresses can sign in.`;
  }

  return null;
}
