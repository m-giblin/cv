import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { coachingCardSchema } from "@/lib/ai/schemas";

const ATTESTATION_TTL_MS = 30 * 60 * 1000;

function attestationSecret() {
  const secret =
    process.env.PLATFORM_SECRETS_ENCRYPTION_KEY ?? process.env.COACHING_ATTESTATION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("COACHING_ATTESTATION_SECRET or PLATFORM_SECRETS_ENCRYPTION_KEY required");
    }
    return "dev-coaching-attestation-secret";
  }
  return secret;
}

export function createCoachingAttestation(userId: string, structuredOutput: unknown): string {
  const parsed = coachingCardSchema.parse(structuredOutput);
  const payload = {
    userId,
    output: parsed,
    exp: Date.now() + ATTESTATION_TTL_MS,
  };

  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", attestationSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyCoachingAttestation(
  userId: string,
  token: string,
  structuredOutput: unknown,
): boolean {
  const [body, sig] = token.split(".");
  if (!body || !sig) {
    return false;
  }

  const expected = createHmac("sha256", attestationSecret()).update(body).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);

  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return false;
  }

  let payload: { userId: string; output: unknown; exp: number };
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as typeof payload;
  } catch {
    return false;
  }

  if (payload.userId !== userId || payload.exp < Date.now()) {
    return false;
  }

  const parsed = coachingCardSchema.safeParse(structuredOutput);
  if (!parsed.success) {
    return false;
  }

  return JSON.stringify(parsed.data) === JSON.stringify(payload.output);
}
