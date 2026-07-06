"use client";

import Link from "next/link";
import { Loader2, Plane } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { SP_OUTLINE_BTN } from "@/components/se/sp-form-primitives";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Question = {
  id: string;
  competency: string;
  type: string;
  prompt: string;
  options?: string[];
  rubricHint: string;
};

const COMPETENCY_AREAS = [
  "Discovery",
  "Objection handling",
  "Demo execution",
  "Competitive positioning",
  "Value articulation",
];

function competencyColor(score: number | null) {
  if (score === null) return "text-[#94a3b8]";
  if (score >= 80) return "text-[#10b981]";
  if (score >= 70) return "text-[#0071ce]";
  return "text-[#f59e0b]";
}

function competencyDotClass(score: number | null) {
  if (score === null) return "bg-[#94a3b8]";
  if (score >= 80) return "bg-[#10b981]";
  if (score >= 70) return "bg-[#0071ce]";
  return "bg-[#f59e0b]";
}

const CARD = "overflow-hidden rounded-xl border border-[#e2eaf5] bg-white shadow-[0_1px_4px_rgba(0,20,58,0.04)]";

export function CompetencyFlightCheck() {
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [focus, setFocus] = useState<string[]>([]);
  const [question, setQuestion] = useState<Question | null>(null);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(6);
  const [answer, setAnswer] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [fieldSignalScore, setFieldSignalScore] = useState<number | null>(null);
  const [competencyScores, setCompetencyScores] = useState<Record<string, number> | null>(null);
  const [actions, setActions] = useState<Array<{ label: string; href: string; reason: string }>>([]);
  const [probeCounts, setProbeCounts] = useState<Record<string, number>>({});

  const loadSession = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/assessments/flight-check");
    if (!response.ok) {
      setLoading(false);
      toast.error("Could not start flight check.");
      return;
    }
    const body = (await response.json()) as {
      sessionId: string;
      focusCompetencies: string[];
      question: Question | null;
      progress: number;
      total: number;
    };
    setSessionId(body.sessionId);
    setFocus(body.focusCompetencies);
    setQuestion(body.question);
    setProgress(body.progress);
    setTotal(body.total);
    setStarted(true);
    setLoading(false);
  }, []);

  async function submitAnswer() {
    if (!question || !sessionId) return;
    setSubmitting(true);

    const payload =
      question.type === "talk_track"
        ? { sessionId, questionId: question.id, answer }
        : { sessionId, questionId: question.id, answer: selected ?? 0 };

    const response = await fetch("/api/assessments/flight-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      toast.error("Could not save answer.");
      setSubmitting(false);
      return;
    }

    const body = (await response.json()) as {
      correct: boolean;
      rubricHint: string;
      progress: number;
      complete: boolean;
      fieldSignalScore: number | null;
      competencyScores: Record<string, number> | null;
      recommendedActions: Array<{ label: string; href: string; reason: string }> | null;
      question: Question | null;
    };

    setProbeCounts((current) => ({
      ...current,
      [question.competency]: (current[question.competency] ?? 0) + 1,
    }));

    toast.message(body.correct ? "Signal strong" : "Gap detected", { description: body.rubricHint });

    if (body.complete) {
      setComplete(true);
      setFieldSignalScore(body.fieldSignalScore);
      setCompetencyScores(body.competencyScores);
      setActions(body.recommendedActions ?? []);
      setQuestion(null);
    } else {
      setQuestion(body.question);
      setProgress(body.progress);
      setAnswer("");
      setSelected(null);
    }

    setSubmitting(false);
  }

  const filledPips = total > 0 ? Math.round((progress / total) * 7) : 0;

  const rightPanel = (
    <div className={cn(CARD, "p-[16px]")}>
      <p className="mb-[12px] text-[12px] font-bold text-[#0a1628]">Competency areas</p>
      <div className="space-y-[10px]">
        {COMPETENCY_AREAS.map((name) => {
          const score = competencyScores?.[name] ?? null;
          const probes = probeCounts[name] ?? 0;
          const pct = score ?? (probes > 0 ? 50 : 0);
          const dotClass = competencyDotClass(score);
          const status =
            score !== null ? "Complete" : probes > 0 ? "Active" : started ? "Pending" : "Not started";
          return (
            <div key={name}>
              <div className="mb-[4px] flex items-center justify-between">
                <div className="flex items-center gap-[6px]">
                  <span className={cn("h-[7px] w-[7px] rounded-full", dotClass)} />
                  <span className="text-[12px] font-semibold text-[#1e293b]">{name}</span>
                </div>
                <span className={cn("text-[10.5px] font-bold", competencyColor(score))}>
                  {score !== null ? `${score}%` : probes > 0 ? "In progress" : "—"}
                </span>
              </div>
              <div className="h-[5px] overflow-hidden rounded-full bg-[#f1f5f9]">
                <div className={cn("h-full rounded-full transition-all", dotClass)} style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-[2px] text-[10px] text-[#94a3b8]">
                {probes}/5 probes · {status}
              </p>
            </div>
          );
        })}
      </div>
      {complete ? (
        <div className="mt-4 space-y-2 border-t border-[#f1f5f9] pt-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#0891b2]">After completion</p>
          {[
            "Gaps auto-assign practice challenges",
            "Spaced sims queued for weak areas",
            "Manager receives readiness score update",
            "Growth snapshot refreshes on My Growth",
          ].map((text, index) => (
            <p className="text-[11px] text-[#64748b]" key={text}>
              <span className="mr-1.5 font-bold text-[#0891b2]">{index + 1}.</span>
              {text}
            </p>
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-2 border-t border-[#f1f5f9] pt-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#0891b2]">After completion</p>
          {[
            "Gaps auto-assign practice challenges in Challenges library",
            "Spaced reinforcement simulations queued in Simulations",
            "Manager receives readiness score + talking points",
            "Results update your Growth competency snapshot",
          ].map((text, index) => (
            <p className="text-[11px] text-[#64748b]" key={text}>
              <span className="mr-1.5 font-bold text-[#0071ce]">{index + 1}.</span>
              {text}
            </p>
          ))}
        </div>
      )}
    </div>
  );

  if (complete && fieldSignalScore !== null) {
    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className={cn(CARD, "border-l-[3px] border-l-[#0891b2] p-6")}>
          <div className="flex items-center gap-2">
            <Plane className="h-5 w-5 text-[#0891b2]" />
            <p className="font-display text-lg font-extrabold text-[#0a1628]">
              Field Signal Score: {fieldSignalScore}
            </p>
          </div>
          <p className="mt-2 text-sm text-[#64748b]">
            Adaptive probe complete — practice has been auto-assigned based on your gaps.
          </p>
          <div className="mt-4 space-y-2">
            {actions.map((action) => (
              <div className="rounded-lg border border-[#e2eaf5] bg-[#f8fafd] p-3" key={action.href}>
                <p className="text-sm font-semibold text-[#0a1628]">{action.label}</p>
                <p className="text-xs text-[#64748b]">{action.reason}</p>
                <Link className="mt-1 inline-block text-xs font-semibold text-[#0071ce]" href={action.href}>
                  Go practice →
                </Link>
              </div>
            ))}
          </div>
        </div>
        {rightPanel}
      </div>
    );
  }

  return (
    <div className="animate-[fadeUp_0.2s_ease-out] grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        {!started ? (
          <div className="rounded-[14px] bg-gradient-to-br from-[#001228] to-[#002468] p-6">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.07em] text-white/40">
              Competency Flight Check · Session 1
            </p>
            <p className="mt-1 font-display text-[17px] font-extrabold text-white">Ready to find your gaps?</p>
            <p className="mt-2 max-w-lg text-xs leading-relaxed text-white/60">
              {total} adaptive probes across {focus.length || 5} competency areas. Results auto-assign practice
              challenges and notify your manager.
            </p>
            <div className="mt-4 flex flex-wrap gap-[9px]">
              <button
                className="inline-flex items-center gap-[5px] rounded-lg bg-[#0891b2] px-[18px] py-[9px] text-[12.5px] font-semibold text-white hover:bg-[#0e7490] disabled:opacity-40"
                disabled={loading}
                onClick={() => void loadSession()}
                type="button"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start flight check →"}
              </button>
              <button
                className="inline-flex items-center gap-[5px] rounded-lg border border-white/15 bg-white/10 px-[14px] py-[8px] text-[12.5px] font-semibold text-white hover:bg-white/15 disabled:opacity-40"
                disabled={loading}
                onClick={() => void loadSession()}
                type="button"
              >
                Resume last session
              </button>
            </div>
          </div>
        ) : null}

        {started ? (
          <div className={CARD}>
            <div className="h-[4px] bg-gradient-to-r from-[#0369a1] to-[#0891b2]" />
            <div className="flex items-center justify-between border-b border-[#f1f5f9] px-[18px] py-3.5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#0891b2]">
                  Question {progress + 1} of {total}
                  {question ? ` · ${question.competency}` : ""}
                </p>
                <p className="text-[11px] text-[#94a3b8]">Difficulty adapts based on your answers</p>
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: 7 }, (_, index) => (
                  <div
                    className={cn(
                      "h-[5px] w-3.5 rounded-full",
                      index < filledPips ? "bg-[#0891b2]" : "bg-[#e2e8f0]",
                    )}
                    key={`pip-${index}`}
                  />
                ))}
              </div>
            </div>
            <div className="px-5 py-[18px]">
              {question ? (
                <>
                  <p className="mb-4 text-[13.5px] font-bold leading-snug text-[#0a1628]">{question.prompt}</p>
                  {question.type === "talk_track" ? (
                    <Textarea
                      className="mb-4"
                      onChange={(event) => setAnswer(event.target.value)}
                      placeholder="One crisp sentence — customer language, not feature dump…"
                      rows={3}
                      value={answer}
                    />
                  ) : (
                    <div className="mb-4 space-y-2">
                      {(question.options ?? []).map((option, index) => {
                        const active = selected === index;
                        return (
                          <button
                            className={cn(
                              "flex w-full gap-2.5 rounded-[9px] border px-3.5 py-2.5 text-left text-xs leading-relaxed transition",
                              active
                                ? "border-[1.5px] border-[#0071ce] bg-[#f0f7ff] text-[#0a1628]"
                                : "border border-[#e2eaf5] bg-white text-[#475569]",
                            )}
                            key={option}
                            onClick={() => setSelected(index)}
                            type="button"
                          >
                            <span
                              className={cn(
                                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9.5px] font-extrabold",
                                active
                                  ? "bg-[#0071ce] text-white"
                                  : "border-[1.5px] border-[#e2eaf5] bg-white text-[#94a3b8]",
                              )}
                            >
                              {String.fromCharCode(65 + index)}
                            </span>
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex gap-[9px]">
                    <button
                      className="inline-flex items-center gap-[5px] rounded-lg bg-[#0891b2] px-[18px] py-[9px] text-[12.5px] font-semibold text-white hover:bg-[#0e7490] disabled:opacity-40"
                      disabled={
                        submitting ||
                        (question.type === "talk_track" ? answer.trim().length < 10 : selected === null)
                      }
                      onClick={() => void submitAnswer()}
                      type="button"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit →"}
                    </button>
                    <button
                      className={SP_OUTLINE_BTN}
                      disabled={submitting}
                      onClick={() => {
                        setSelected(0);
                        void submitAnswer();
                      }}
                      type="button"
                    >
                      Skip question
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-sm text-[#64748b]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading next probe…
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
      {rightPanel}
    </div>
  );
}
