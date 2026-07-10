"use client";

import Link from "next/link";
import { Loader2, Plane } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
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

const FOCUS_COLORS: Record<string, string> = {
  "Objection handling": "#D4810A",
  Discovery: "#0A6E45",
  "Value articulation": "#0071CE",
  "Demo execution": "#0369A1",
  "Competitive positioning": "#5b21b6",
};

function competencyColor(score: number | null) {
  if (score === null) return "#B0ADA8";
  if (score >= 80) return "#0A6E45";
  if (score >= 70) return "#0071CE";
  return "#D4810A";
}

export function CompetencyFlightCheck({
  onProgressHintChange,
}: {
  onProgressHintChange?: (hint: string) => void;
}) {
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

  const lowestFocus = focus[0] ?? "Objection handling";
  const questionNumber = Math.min(progress + 1, total);

  useEffect(() => {
    if (!started) {
      onProgressHintChange?.("Adaptive assessment");
      return;
    }
    if (complete) {
      onProgressHintChange?.("Check complete");
      return;
    }
    onProgressHintChange?.(
      `Question ${questionNumber} of ${total} · Difficulty adapting to your gaps`,
    );
  }, [complete, onProgressHintChange, questionNumber, started, total]);

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

  async function submitAnswer(skip = false) {
    if (!question || !sessionId) return;
    setSubmitting(true);

    const payload =
      question.type === "talk_track"
        ? { sessionId, questionId: question.id, answer: skip ? "" : answer }
        : {
            sessionId,
            questionId: question.id,
            answer: skip ? 0 : (selected ?? 0),
          };

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

    if (body.competencyScores) {
      setCompetencyScores(body.competencyScores);
    }

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

  const progressPct = total > 0 ? (progress / total) * 100 : 0;

  const scoresPanel = (
    <div>
      <p className="mb-3 font-mono text-[8px] uppercase tracking-[0.12em] text-[#B0ADA8]">Scores so far</p>
      <div className="space-y-2.5">
        {COMPETENCY_AREAS.map((name) => {
          const score = competencyScores?.[name] ?? null;
          const probes = probeCounts[name] ?? 0;
          const pct = score ?? (probes > 0 ? 50 : 0);
          const color = competencyColor(score);
          return (
            <div key={name}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] text-[#3D3C38]">{name}</span>
                <span className="font-mono text-xs font-medium" style={{ color }}>
                  {score !== null ? score : probes > 0 ? "…" : "—"}
                </span>
              </div>
              <div className="h-[3px] bg-[#ECEAE6]">
                <div className="h-full transition-all" style={{ background: color, width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      {started ? (
        <div className="mt-4 border border-[#E2DFD9] bg-white px-3 py-2.5">
          <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-[#0369A1]">Adaptive mode</p>
          <p className="mt-1 text-[11px] leading-relaxed text-[#6B6860]">
            Difficulty increases on strong answers. Next question targets{" "}
            <strong className="text-[#0D0E12]">{lowestFocus}</strong> — your lowest area.
          </p>
        </div>
      ) : null}
    </div>
  );

  const sessionPanel = (
    <div>
      <p className="mb-3 font-mono text-[8px] uppercase tracking-[0.12em] text-[#B0ADA8]">This session</p>
      <div className="mb-3.5 grid grid-cols-2 gap-px border border-[#E2DFD9] bg-[#E2DFD9]">
        <div className="bg-white px-3 py-2.5 text-center">
          <p className="font-mono text-[22px] leading-none text-[#0D0E12]">{progress}</p>
          <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.08em] text-[#B0ADA8]">Done</p>
        </div>
        <div className="bg-white px-3 py-2.5 text-center">
          <p className="font-mono text-[22px] leading-none text-[#0369A1]">{Math.max(0, total - progress)}</p>
          <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.08em] text-[#B0ADA8]">Left</p>
        </div>
      </div>
      <p className="mb-2 font-mono text-[8px] uppercase tracking-[0.1em] text-[#B0ADA8]">Focus areas</p>
      <div className="mb-3.5 flex flex-col gap-1">
        {(focus.length > 0 ? focus : ["Objection handling", "Discovery", "Value articulation"]).map((item) => (
          <div
            className="flex items-center gap-1.5 border border-[#E2DFD9] bg-white px-2.5 py-1.5"
            key={item}
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: FOCUS_COLORS[item] ?? "#B0ADA8" }}
            />
            <span className="text-[11px] text-[#3D3C38]">{item}</span>
          </div>
        ))}
      </div>
      <div className="border-l-[3px] border-[#0369A1] bg-[#E0F2FE] px-3 py-2.5">
        <p className="mb-1 font-mono text-[8px] uppercase tracking-[0.1em] text-[#0369A1]">After this check</p>
        <p className="text-[11px] leading-relaxed text-[#1A3A5C]">
          Auto-assigns practice matched to your weakest result. No manual selection needed.
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {started ? (
        <div className="h-[3px] shrink-0 bg-[#ECEAE6]">
          <div
            className="h-full bg-[#0369A1] transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[240px_1fr_240px]">
        <aside className="hidden min-h-0 overflow-y-auto border-r border-[#E2DFD9] bg-[#F9F8F6] p-4 lg:block">
          {started || complete ? scoresPanel : <p className="text-[11px] text-[#6B6860]">Scores appear once you start.</p>}
        </aside>

        <main className="min-h-0 overflow-y-auto bg-white">
          {complete && fieldSignalScore !== null ? (
            <div className="mx-auto max-w-[640px] px-10 py-9">
              <div className="flex items-center gap-2">
                <Plane className="h-5 w-5 text-[#0369A1]" />
                <p className="font-display text-lg font-extrabold text-[#0D0E12]">
                  Field Signal Score: {fieldSignalScore}
                </p>
              </div>
              <p className="mt-2 text-sm text-[#6B6860]">
                Adaptive probe complete — practice has been auto-assigned based on your gaps.
              </p>
              <div className="mt-4 space-y-2">
                {actions.map((action) => (
                  <div className="border border-[#E2DFD9] bg-[#F9F8F6] p-3" key={action.href}>
                    <p className="text-sm font-semibold text-[#0D0E12]">{action.label}</p>
                    <p className="text-xs text-[#6B6860]">{action.reason}</p>
                    <Link className="mt-1 inline-block text-xs font-semibold text-[#0071ce]" href={action.href}>
                      Go practice →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ) : !started ? (
            <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-[#001228] to-[#002468] p-8">
              <div className="max-w-lg text-center lg:text-left">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/40">
                  Competency Flight Check · Session 1
                </p>
                <p className="mt-2 font-display text-xl font-extrabold text-white">Ready to find your gaps?</p>
                <p className="mt-2 text-xs leading-relaxed text-white/60">
                  {total} adaptive probes across competency areas. Results auto-assign practice challenges and
                  notify your manager.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2 lg:justify-start">
                  <button
                    className="bg-[#0369A1] px-5 py-2.5 text-[12.5px] font-semibold text-white hover:bg-[#025a8a] disabled:opacity-50"
                    disabled={loading}
                    onClick={() => void loadSession()}
                    type="button"
                  >
                    {loading ? <Loader2 className="inline h-4 w-4 animate-spin" /> : "Start flight check →"}
                  </button>
                  <button
                    className="border border-white/15 bg-white/10 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-white/15 disabled:opacity-50"
                    disabled={loading}
                    onClick={() => void loadSession()}
                    type="button"
                  >
                    Resume last session
                  </button>
                </div>
              </div>
            </div>
          ) : question ? (
            <div className="mx-auto flex w-full max-w-[640px] flex-col px-10 py-9">
              <p className="mb-2 text-center font-mono text-[9px] uppercase tracking-[0.16em] text-[#0369A1]">
                {question.competency} · Question {questionNumber}
              </p>
              <h2 className="mb-7 text-center font-display text-xl font-extrabold leading-snug tracking-[-0.025em] text-[#0D0E12]">
                &ldquo;{question.prompt}&rdquo;
              </h2>

              {question.type !== "talk_track" ? (
                <div className="mb-7 flex w-full flex-col gap-2">
                  {(question.options ?? []).map((option, index) => {
                    const active = selected === index;
                    return (
                      <button
                        className={cn(
                          "flex items-start gap-3 border-[1.5px] px-4 py-3 text-left text-xs leading-relaxed transition",
                          active
                            ? "border-[#0369A1] bg-[#EEF4FF] text-[#0D0E12]"
                            : "border-[#E2DFD9] bg-white text-[#0D0E12]",
                        )}
                        key={option}
                        onClick={() => setSelected(index)}
                        type="button"
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px]",
                            active ? "border-[#0369A1] bg-[#EEF4FF]" : "border-[#D4D1CB] bg-white",
                          )}
                        >
                          {active ? <span className="h-2 w-2 rounded-full bg-[#0369A1]" /> : null}
                        </span>
                        {option}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <div className="mb-4 w-full border border-[#E2DFD9] bg-[#F9F8F6] px-3.5 py-2.5">
                <p className="mb-1 font-mono text-[8px] uppercase tracking-[0.1em] text-[#B0ADA8]">
                  Or write your own response
                </p>
                <Textarea
                  className="min-h-[52px] resize-none border-0 bg-transparent p-0 text-[11.5px] leading-relaxed text-[#3D3C38] shadow-none focus-visible:ring-0"
                  onChange={(event) => setAnswer(event.target.value)}
                  placeholder="I'd focus on SailPoint's deployment methodology — we have a dedicated success framework…"
                  rows={2}
                  value={answer}
                />
              </div>

              <div className="flex w-full justify-end gap-2">
                <button
                  className="border border-[#E2DFD9] bg-white px-4 py-2 text-[11px] font-semibold text-[#3D3C38] hover:bg-[#F9F8F6] disabled:opacity-50"
                  disabled={submitting}
                  onClick={() => void submitAnswer(true)}
                  type="button"
                >
                  Skip
                </button>
                <button
                  className="bg-[#0369A1] px-5 py-2 text-[11px] font-semibold text-white hover:bg-[#025a8a] disabled:opacity-50"
                  disabled={
                    submitting ||
                    (question.type === "talk_track"
                      ? answer.trim().length < 10
                      : selected === null && answer.trim().length < 10)
                  }
                  onClick={() => void submitAnswer()}
                  type="button"
                >
                  {submitting ? <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> : "Next question →"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 p-12 text-sm text-[#6B6860]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading next probe…
            </div>
          )}
        </main>

        <aside className="hidden min-h-0 overflow-y-auto border-l border-[#E2DFD9] bg-[#F9F8F6] p-4 lg:block">
          {sessionPanel}
        </aside>
      </div>
    </div>
  );
}
