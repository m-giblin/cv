const BASE_DOMAINS = ["sailpoint.com"] as const;

const DEV_DOMAINS =
  process.env.ALLOW_DEV_EMAIL_DOMAIN === "true" || process.env.NODE_ENV !== "production"
    ? (["example.com"] as const)
    : ([] as const);

export const ALLOWED_EMAIL_DOMAINS = [...BASE_DOMAINS, ...DEV_DOMAINS] as readonly string[];

/** Primary domain shown in UI placeholders */
export const ALLOWED_EMAIL_DOMAIN = BASE_DOMAINS[0];

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
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
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
