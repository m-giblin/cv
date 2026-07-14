/** Label shown in authenticator apps for TOTP enrollment (QR + manual key). */
export function mfaTotpIssuer(): string {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_MFA_ISSUER ?? "SailPoint SE Enablement";
  }

  if (process.env.NEXT_PUBLIC_MFA_ISSUER) {
    return process.env.NEXT_PUBLIC_MFA_ISSUER;
  }

  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return "SailPoint SE Enablement (local)";
  }

  return "SailPoint SE Enablement";
}
