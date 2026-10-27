import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

/**
 * A served quiz is bound to the person it was served to, the exact questions, and a quiz id, so
 * answers can only be graded for questions that were actually served, once. Without this, anyone
 * could post arbitrary question ids and read every answer key and explanation in the bank.
 */

const QUIZ_TTL_MS = 2 * 60 * 60 * 1000;

type QuizClaims = { quizId: string; userId: string; questionIds: string[]; expiresAt: number };

function secret() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.CRON_SECRET;
  if (!key) throw new Error("No server secret is configured to sign quizzes.");
  return `question-bank-quiz:${key}`;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function signQuiz(userId: string, questionIds: string[], now = Date.now()) {
  const claims: QuizClaims = { quizId: randomUUID(), userId, questionIds, expiresAt: now + QUIZ_TTL_MS };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return { token: `${payload}.${sign(payload)}`, quizId: claims.quizId };
}

export function verifyQuiz(token: string, userId: string, now = Date.now()): QuizClaims | null {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as QuizClaims;
    if (claims.userId !== userId || claims.expiresAt < now || !Array.isArray(claims.questionIds)) return null;
    return claims;
  } catch {
    return null;
  }
}
