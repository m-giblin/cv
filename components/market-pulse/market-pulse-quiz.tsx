"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AnimatedProgressFill } from "@/components/se/northstar-animated";
import { SP_OUTLINE_BTN, SP_BLUE_BTN } from "@/components/se/sp-form-primitives";
import { cn } from "@/lib/utils";

type PulseQuestion = {
  id: string;
  topic: string;
  question: string;
  options: string[];
};

type Explanation = { id: string; correctIndex: number; explanation: string };

type Reinforcement = { id: string; title: string; reason: string };

const COMPETITORS = ["Microsoft Entra", "Okta", "CyberArk", "Saviynt", "DIY / Copilot"];

const MORE_QUIZZES = [
  { name: "SailPoint vs. Okta — Agent governance", tag: "In progress", tagBg: "#dbeafe", tagColor: "#1d4ed8", score: "—", scoreColor: "#0071ce", sub: "5 questions · Competitive positioning", cta: "Continue", state: "active" as const },
  { name: "SailPoint vs. Entra — Copilot policies", tag: "Available", tagBg: "#f1f5f9", tagColor: "#64748b", score: "—", scoreColor: "#94a3b8", sub: "5 questions · ~4 min", cta: "Start quiz", state: "available" as const },
  { name: "Saviynt vs. SailPoint — SoD controls", tag: "Available", tagBg: "#f1f5f9", tagColor: "#64748b", score: "80%", scoreColor: "#10b981", sub: "Completed Oct 12", cta: "Review", state: "available" as const },
  { name: "DIY / Copilot-only trap questions", tag: "Available", tagBg: "#f1f5f9", tagColor: "#64748b", score: "65%", scoreColor: "#f59e0b", sub: "Completed Oct 5", cta: "Review", state: "available" as const },
  { name: "CyberArk PAM vs. ISC governance", tag: "Coming soon", tagBg: "#f1f5f9", tagColor: "#94a3b8", score: "—", scoreColor: "#cbd5e1", sub: "Unlocks next week", cta: "Locked", state: "locked" as const },
  { name: "Federal vertical competitive set", tag: "Coming soon", tagBg: "#f1f5f9", tagColor: "#94a3b8", score: "—", scoreColor: "#cbd5e1", sub: "Unlocks next week", cta: "Locked", state: "locked" as const },
];

export function MarketPulseQuiz() {
  const [questions, setQuestions] = useState<PulseQuestion[]>([]);
  const [weekId, setWeekId] = useState("");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [explanations, setExplanations] = useState<Explanation[]>([]);
  const [reinforcements, setReinforcements] = useState<Reinforcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/market-pulse");
      if (!response.ok) {
        setLoading(false);
        return;
      }
      const body = (await response.json()) as {
        weekId: string;
        questions: PulseQuestion[];
        submitted: { score: number; total: number } | null;
      };
      setWeekId(body.weekId);
      setQuestions(body.questions);
      if (body.submitted) {
        setSubmitted(true);
        setScore(body.submitted.score);
      }
      setLoading(false);
    })();
  }, []);

  async function handleSubmit() {
    if (Object.keys(answers).length < questions.length) {
      toast.error("Answer all questions first.");
      return;
    }

    const response = await fetch("/api/market-pulse/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekId, answers }),
    });

    if (!response.ok) {
      toast.error("Could not save your pulse score.");
      return;
    }

    const body = (await response.json()) as {
      score: number;
      total: number;
      explanations: Explanation[];
      reinforcements?: Reinforcement[];
    };
    setScore(body.score);
    setExplanations(body.explanations);
    setReinforcements(body.reinforcements ?? []);
    setSubmitted(true);
    toast.success(`Score: ${body.score}/${body.total}`);
  }

  if (loading) {
    return <p className="text-sm text-[#64748b]">Loading this week&apos;s market pulse…</p>;
  }

  if (questions.length === 0) {
    return <p className="text-sm text-[#64748b]">Market pulse unavailable — check Supabase connection.</p>;
  }

  const explanationMap = new Map(explanations.map((item) => [item.id, item]));
  const answeredCount = Object.keys(answers).length;
  const avgScorePct =
    submitted && questions.length > 0 ? Math.round((score / questions.length) * 100) : answeredCount > 0 ? "—" : "—";
  const activeQuestion = questions[activeIndex];
  const activeExplain = activeQuestion ? explanationMap.get(activeQuestion.id) : undefined;

  return (
    <div className="animate-[fadeUp_0.2s_ease-out] space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Competitive score",
            value: submitted ? `${Math.round((score / questions.length) * 100)}%` : "—",
            accent: "#0071ce",
          },
          { label: "Quizzes completed", value: submitted ? "1" : "0", accent: "#10b981" },
          {
            label: "Avg quiz score",
            value: typeof avgScorePct === "string" ? avgScorePct : `${avgScorePct}%`,
            accent: "#cc27b0",
          },
          { label: "Current streak", value: submitted ? "1 wk" : "0", accent: "#f59e0b" },
        ].map((stat) => (
          <div
            className="rounded-xl border border-[#e2eaf5] border-l-[3px] bg-white p-3 shadow-[0_1px_4px_rgba(0,20,58,0.04)]"
            key={stat.label}
            style={{ borderLeftColor: stat.accent }}
          >
            <p className="text-[10px] font-bold uppercase text-[#94a3b8]">{stat.label}</p>
            <p className="mt-1 font-display text-xl font-extrabold text-[#0a1628]">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="overflow-hidden rounded-xl border border-[#e2eaf5] bg-white shadow-[0_1px_4px_rgba(0,20,58,0.04)]">
          <div className="h-[3px]" style={{ background: "linear-gradient(90deg,#0369a1,#0891b2)" }} />
          <div className="border-b border-[#f1f5f9] px-5 py-4">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.07em] text-[#0891b2]">
              Week {weekId} · SailPoint vs. market
            </p>
            <p className="mt-1 font-display text-[15px] font-extrabold text-[#0a1628]">
              {activeQuestion?.topic ?? "Weekly pulse"}
            </p>
            <div className="mt-3 flex gap-[4px]">
              {questions.map((question, index) => {
                const answered = answers[question.id] !== undefined;
                return (
                  <button
                    className={cn(
                      "h-[5px] w-[14px] rounded-full transition",
                      index === activeIndex
                        ? "bg-[#0891b2]"
                        : answered
                          ? "bg-[#0891b2]/45"
                          : "bg-[#e2e8f0]",
                    )}
                    key={question.id}
                    onClick={() => setActiveIndex(index)}
                    type="button"
                  />
                );
              })}
            </div>
          </div>

          {activeQuestion ? (
            <div className="px-5 py-4">
              <p className="mb-4 text-[13px] font-bold leading-[1.55] text-[#0a1628]">{activeQuestion.question}</p>
              <div className="space-y-2">
                {activeQuestion.options.map((option, optionIndex) => {
                  const selected = answers[activeQuestion.id] === optionIndex;
                  const showResult = submitted && activeExplain;
                  const isCorrect = activeExplain?.correctIndex === optionIndex;

                  return (
                    <button
                      className={cn(
                        "flex w-full gap-2.5 rounded-[9px] border px-3.5 py-2.5 text-left text-[12px] leading-[1.5] transition",
                        showResult && isCorrect
                          ? "border-emerald-300 bg-emerald-50 text-[#0a1628]"
                          : showResult && selected && !isCorrect
                            ? "border-red-200 bg-red-50 text-[#0a1628]"
                            : selected
                              ? "border-[1.5px] border-[#0071ce] bg-[#f0f7ff] text-[#0a1628]"
                              : "border border-[#e2eaf5] bg-white text-[#475569]",
                      )}
                      disabled={submitted}
                      key={option}
                      onClick={() => setAnswers((current) => ({ ...current, [activeQuestion.id]: optionIndex }))}
                      type="button"
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9.5px] font-extrabold",
                          selected ? "bg-[#0071ce] text-white" : "border-[1.5px] border-[#e2eaf5] text-[#94a3b8]",
                        )}
                      >
                        {String.fromCharCode(65 + optionIndex)}
                      </span>
                      {option}
                    </button>
                  );
                })}
              </div>
              {submitted && activeExplain ? (
                <p className="mt-3 text-sm leading-6 text-[#64748b]">{activeExplain.explanation}</p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-[9px]">
                {!submitted ? (
                  <>
                    <button
                      className={cn(SP_BLUE_BTN, "disabled:opacity-40 disabled:cursor-not-allowed")}
                      disabled={answers[activeQuestion.id] === undefined}
                      onClick={() => {
                        if (activeIndex < questions.length - 1) {
                          setActiveIndex(activeIndex + 1);
                        }
                      }}
                      type="button"
                    >
                      {activeIndex < questions.length - 1 ? "Next question →" : "Review answers"}
                    </button>
                    <button
                      className={SP_OUTLINE_BTN}
                      onClick={() => setActiveIndex((index) => Math.min(index + 1, questions.length - 1))}
                      type="button"
                    >
                      Skip
                    </button>
                  </>
                ) : null}
                {!submitted && answeredCount === questions.length ? (
                  <button className={SP_BLUE_BTN} onClick={() => void handleSubmit()} type="button">
                    Submit weekly pulse
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <aside className="space-y-3">
          <div className="rounded-xl border border-[#e2eaf5] bg-white p-4 shadow-[0_1px_4px_rgba(0,20,58,0.04)]">
            <p className="text-xs font-bold text-[#0a1628]">Competitor coverage</p>
            <div className="mt-3 space-y-2.5">
              {COMPETITORS.map((name, index) => {
                const mastery = submitted ? Math.max(20, 100 - index * 15) : index === 0 ? 40 : 0;
                return (
                  <div key={name}>
                    <div className="mb-1 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-[#1e293b]">{name}</span>
                      <span className="font-bold text-[#0071ce]">{mastery > 0 ? `${mastery}%` : "—"}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#e8f2fc]">
                      <AnimatedProgressFill percent={mastery} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-[#e2eaf5] bg-white p-4 shadow-[0_1px_4px_rgba(0,20,58,0.04)]">
            <p className="text-xs font-bold text-[#0a1628]">Recent scores</p>
            {submitted ? (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="font-display text-lg font-extrabold text-emerald-900">
                  {score}/{questions.length}
                </p>
                <p className="text-[11px] text-emerald-800">Week {weekId}</p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-[#94a3b8]">Complete this week&apos;s pulse to log your score.</p>
            )}
          </div>
        </aside>
      </div>

      <section>
        <h2 className="font-display text-sm font-bold text-[#0a1628]">More quizzes</h2>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {MORE_QUIZZES.map((quiz) => (
            <div
              className={cn(
                "rounded-xl border bg-white p-3.5 shadow-[0_1px_4px_rgba(0,20,58,0.04)]",
                quiz.state === "active" ? "border-2 border-[#0071ce]/30" : "border-[#e2eaf5]",
                quiz.state === "locked" && "opacity-60",
              )}
              key={quiz.name}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span
                  className="rounded-full px-2 py-0.5 text-[9.5px] font-bold"
                  style={{ backgroundColor: quiz.tagBg, color: quiz.tagColor }}
                >
                  {quiz.tag}
                </span>
                <span className="text-[10.5px] font-bold" style={{ color: quiz.scoreColor }}>
                  {quiz.score}
                </span>
              </div>
              <p className="text-[12.5px] font-bold text-[#0a1628]">{quiz.name}</p>
              <p className="mt-0.5 text-[10.5px] text-[#64748b]">{quiz.sub}</p>
              <button
                className={cn(
                  "mt-2.5 w-full rounded-lg px-3 py-1.5 text-[11px] font-semibold",
                  quiz.state === "locked"
                    ? "cursor-not-allowed bg-[#f1f5f9] text-[#94a3b8]"
                    : quiz.state === "active"
                      ? "bg-[#0071ce] text-white hover:bg-[#0057a8]"
                      : "border border-[#e2eaf5] bg-white text-[#475569] hover:bg-[#f8fafd]",
                )}
                disabled={quiz.state === "locked"}
                type="button"
              >
                {quiz.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {submitted && reinforcements.length > 0 ? (
        <div className="rounded-xl border border-[#e2eaf5] bg-white p-4 shadow-[0_1px_4px_rgba(0,20,58,0.04)]">
          <p className="font-display text-sm font-extrabold text-[#0a1628]">Reinforce with practice</p>
          <p className="mt-1 text-xs text-[#64748b]">Missed topics — assign yourself a matching challenge.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {reinforcements.map((item) => (
              <div className="rounded-xl border border-[#e2eaf5] bg-[#f8fafd] p-3" key={item.id}>
                <p className="text-sm font-semibold text-[#0a1628]">{item.title}</p>
                <p className="mt-1 text-xs text-[#64748b]">{item.reason}</p>
                <Link
                  className="mt-2 inline-block text-xs font-semibold text-[#0071ce] hover:underline"
                  href={`/challenges?challenge=${item.id}`}
                >
                  Open challenge →
                </Link>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
