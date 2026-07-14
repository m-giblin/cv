const GONG_AUTH_BASE = "https://app.gong.io/oauth2";

export function isGongOAuthConfigured() {
  return Boolean(process.env.GONG_CLIENT_ID && process.env.GONG_CLIENT_SECRET);
}

export function buildGongAuthorizeUrl(state: string) {
  const clientId = process.env.GONG_CLIENT_ID;
  const redirectUri = process.env.GONG_REDIRECT_URI ?? `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3003"}/api/integrations/gong/oauth/callback`;

  if (!clientId) {
    throw new Error("GONG_CLIENT_ID is not configured.");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    state,
    scope: "api:calls:read:basic api:users:read",
  });

  return `${GONG_AUTH_BASE}/authorize?${params.toString()}`;
}

export async function exchangeGongCode(code: string) {
  const clientId = process.env.GONG_CLIENT_ID;
  const clientSecret = process.env.GONG_CLIENT_SECRET;
  const redirectUri = process.env.GONG_REDIRECT_URI ?? `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3003"}/api/integrations/gong/oauth/callback`;

  if (!clientId || !clientSecret) {
    throw new Error("Gong OAuth is not configured.");
  }

  const response = await fetch(`${GONG_AUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error("Gong token exchange failed.");
  }

  return (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };
}
