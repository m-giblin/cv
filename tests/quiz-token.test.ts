import { beforeAll, describe, expect, it } from "vitest";
import { signQuiz, verifyQuiz } from "@/lib/question-bank/quiz-token";

beforeAll(() => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
});

describe("quiz token", () => {
  it("round-trips for the person it was served to", () => {
    const { token, quizId } = signQuiz("user-1", ["q1", "q2"]);
    const claims = verifyQuiz(token, "user-1");
    expect(claims?.quizId).toBe(quizId);
    expect(claims?.questionIds).toEqual(["q1", "q2"]);
  });

  it("rejects another user, tampering and expiry", () => {
    const { token } = signQuiz("user-1", ["q1"], 1_000);
    expect(verifyQuiz(token, "user-2", 2_000)).toBeNull();
    expect(verifyQuiz(`${token.slice(0, -2)}xx`, "user-1", 2_000)).toBeNull();
    expect(verifyQuiz(token, "user-1", 1_000 + 3 * 60 * 60 * 1000)).toBeNull();
    expect(verifyQuiz("garbage", "user-1")).toBeNull();
  });
});
