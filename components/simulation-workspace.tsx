"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Bot, ChevronDown, Loader2, MessageSquareText, RotateCcw, Send, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { coachingCardSchema, type CoachingCardOutput } from "@/lib/ai/schemas";
import { difficultyToPromptLabel, isElevatorPitchTemplate } from "@/lib/simulations/prompt-template";
import { simulationRubricCriteria } from "@/lib/simulations/session-rubric";
import { SimulationRubricPanel } from "@/components/simulation/simulation-rubric-panel";
import { SimulationSpeechInput } from "@/components/simulation/speech-input";
import { SP_BLUE_BTN, SP_OUTLINE_BTN } from "@/components/se/sp-form-primitives";
import { SimulationAssignment } from "@/lib/types";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  message: z.string().min(1, "Add a response for the persona."),
});

type TranscriptEntry = SimulationAssignment["transcript"][number];

function initialsFromName(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

async function persistTranscript(
  assignmentId: string,
  transcript: TranscriptEntry[],
  status?: "in_progress" | "completed",
) {
  if (assignmentId.startsWith("practice")) {
    return;
  }

  await fetch(`/api/simulations/assignments/${assignmentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript, status }),
  });
}

function SimulationStepStrip({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { n: 1 as const, label: "Roleplay", hint: "Respond to the persona" },
    { n: 2 as const, label: "Get feedback", hint: "Generate coaching card" },
    { n: 3 as const, label: "Submit", hint: "Reflect & send to manager" },
  ];

  return (
    <ol className="flex flex-wrap gap-2">
      {steps.map((item) => {
        const active = step === item.n;
        const done = step > item.n;
        return (
          <li
            className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl border px-3 py-2 text-xs sm:min-w-[140px] sm:flex-none ${
              active
                ? "border-sp-blue/30 bg-sp-blue-soft/60 text-sp-blue-deep"
                : done
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-stone-200 bg-stone-50 text-stone-500"
            }`}
            key={item.n}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                active ? "bg-sp-blue text-white" : done ? "bg-emerald-600 text-white" : "bg-stone-200 text-stone-600"
              }`}
            >
              {item.n}
            </span>
            <span>
              <span className="block font-semibold">{item.label}</span>
              {active ? <span className="hidden text-[10px] opacity-80 sm:block">{item.hint}</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function SimulationWorkspace({
  assignment,
  userLevel = "Basic",
  variant = "full",
  onClose,
}: {
  assignment: SimulationAssignment;
  userLevel?: "Basic" | "Senior" | "Advisory";
  variant?: "full" | "embedded";
  onClose?: () => void;
}) {
  const [messages, setMessages] = useState<TranscriptEntry[]>(assignment.transcript ?? []);
  const [coachingCard, setCoachingCard] = useState<CoachingCardOutput | null>(null);
  const [seReflection, setSeReflection] = useState("");
  const [showReflectionPrompt, setShowReflectionPrompt] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [roleplayEnded, setRoleplayEnded] = useState(false);
  const [practiceRoundsCompleted, setPracticeRoundsCompleted] = useState(
    assignment.practiceRoundsCompleted ?? 0,
  );
  const [showCoachingPanel, setShowCoachingPanel] = useState(false);
  const [attestationToken, setAttestationToken] = useState<string | null>(null);
  const startedRef = useRef(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (assignment.id.startsWith("practice") || (assignment.transcript?.length ?? 0) > 0) {
      return;
    }

    let cancelled = false;

    void fetch(`/api/simulations/assignments/${assignment.id}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { assignment?: { transcript?: TranscriptEntry[] } } | null) => {
        if (cancelled || !body?.assignment?.transcript?.length) {
          return;
        }
        setMessages(body.assignment.transcript);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [assignment.id, assignment.transcript]);

  const practiceRoundsRecommended = assignment.practiceRoundsRequired ?? 1;
  const hasFormalAssignment = !assignment.id.startsWith("practice");
  const practiceRemaining = Math.max(0, practiceRoundsRecommended - practiceRoundsCompleted);
  const belowPracticeRecommendation =
    hasFormalAssignment &&
    practiceRoundsRecommended > 0 &&
    practiceRoundsCompleted < practiceRoundsRecommended;
  const isEmbedded = variant === "embedded";

  const aiRoleplay = assignment.aiRoleplay ?? Boolean(assignment.promptSnapshot);
  const promptSnapshot = assignment.promptSnapshot;
  const startMessage = assignment.startMessage;
  const isElevatorPitch = promptSnapshot ? isElevatorPitchTemplate(promptSnapshot) : false;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { message: "" },
  });

  const currentStep: 1 | 2 | 3 = coachingCard ? 3 : messages.length >= 2 ? 2 : 1;
  const isObjectionPractice = assignment.persona.toLowerCase().includes("objection practice");
  const rubricCriteria = simulationRubricCriteria({
    isElevatorPitch,
    isObjectionPractice,
    persona: assignment.persona,
  });
  const showPreSessionRubric = currentStep === 1 && messages.length < 2;

  const transcript = useMemo(
    () =>
      messages
        .map((message) => {
          const label =
            message.speaker === "se"
              ? "SE"
              : message.speaker === "coach"
                ? "Coach"
                : assignment.persona;
          return `${label}: ${message.message}`;
        })
        .join("\n"),
    [assignment.persona, messages],
  );

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isThinking]);

  useEffect(() => {
    if (coachingCard) {
      setShowCoachingPanel(true);
    }
  }, [coachingCard]);

  async function requestAiTurn(
    currentMessages: TranscriptEntry[],
    options: { message?: string; isStart?: boolean },
  ) {
    if (!promptSnapshot) {
      throw new Error("Simulation prompt is not configured.");
    }

    const response = await fetch("/api/ai/simulation-turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignmentId: assignment.id.startsWith("practice") ? undefined : assignment.id,
        promptSnapshot,
        transcript: currentMessages,
        message: options.message,
        isStart: options.isStart,
        startMessage: options.isStart ? startMessage : undefined,
      }),
    });

    if (!response.ok) {
      throw new Error("Simulation turn failed");
    }

    return response.json() as Promise<{
      response: string;
      speaker: "persona" | "coach";
      roleplayEnded: boolean;
    }>;
  }

  async function startSimulation() {
    if (!aiRoleplay || !promptSnapshot || startedRef.current || messages.length > 0) {
      return;
    }

    startedRef.current = true;
    setIsThinking(true);

    try {
      const payload = await requestAiTurn([], { isStart: true });
      const nextMessages: TranscriptEntry[] = [
        { speaker: payload.speaker, message: payload.response },
      ];
      setMessages(nextMessages);
      setRoleplayEnded(payload.roleplayEnded);
      await persistTranscript(assignment.id, nextMessages, "in_progress");
    } catch (error) {
      startedRef.current = false;
      toast.error("Could not start simulation", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsThinking(false);
    }
  }

  useEffect(() => {
    void startSimulation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignment.id, aiRoleplay, promptSnapshot]);

  async function addTurn(values: z.infer<typeof formSchema>) {
    if (isThinking) {
      return;
    }

    const seMessage = values.message.trim();
    const withSe: TranscriptEntry[] = [...messages, { speaker: "se", message: seMessage }];
    setMessages(withSe);
    form.reset({ message: "" });

    if (!aiRoleplay || !promptSnapshot) {
      const personaPushbacks = [
        "That sounds reasonable, but my team already has policy documents. What evidence would SailPoint give me that the policy is actually being followed?",
        "We are trying to avoid another long implementation. How would this help us show audit progress quickly?",
      ];
      const fallback: TranscriptEntry[] = [
        ...withSe,
        {
          speaker: "persona",
          message: personaPushbacks[messages.length % personaPushbacks.length],
        },
      ];
      setMessages(fallback);
      return;
    }

    setIsThinking(true);

    try {
      const payload = await requestAiTurn(withSe, { message: seMessage });
      const nextMessages: TranscriptEntry[] = [
        ...withSe,
        { speaker: payload.speaker, message: payload.response },
      ];
      setMessages(nextMessages);
      setRoleplayEnded(payload.roleplayEnded);
      await persistTranscript(
        assignment.id,
        nextMessages,
        payload.roleplayEnded ? "completed" : "in_progress",
      );
    } catch (error) {
      toast.error("Persona response failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsThinking(false);
    }
  }

  async function generateCoachingCard() {
    setIsGenerating(true);

    try {
      const response = await fetch("/api/ai/coaching-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona: assignment.persona,
          vertical: assignment.vertical,
          solutionFocus: assignment.solutionFocus,
          level: userLevel,
          transcript,
          sledDebrief: aiRoleplay && roleplayEnded,
        }),
      });

      if (!response.ok) {
        throw new Error("Coaching card generation failed");
      }

      const payload = (await response.json()) as { object: unknown; attestationToken?: string };
      const parsed = coachingCardSchema.parse(payload.object);
      setCoachingCard(parsed);
      setAttestationToken(payload.attestationToken ?? null);
      setShowReflectionPrompt(true);
      setShowCoachingPanel(true);
    } catch (error) {
      toast.error("Could not generate coaching card", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsGenerating(false);
    }
  }

  async function resetForNextRound() {
    setMessages([]);
    setCoachingCard(null);
    setAttestationToken(null);
    setSeReflection("");
    setShowReflectionPrompt(false);
    setShowCoachingPanel(false);
    setRoleplayEnded(false);
    startedRef.current = false;
    await startSimulation();
  }

  async function saveCoachingCard(mode: "practice" | "submit") {
    if (!coachingCard) {
      return;
    }

    if (seReflection.trim().length < 10) {
      toast.error("Add a short reflection before saving.");
      return;
    }

    setIsGenerating(true);

    try {
      const saveResponse = await fetch("/api/simulations/coaching-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          simulationAssignmentId: assignment.id.startsWith("practice") ? undefined : assignment.id,
          structuredOutput: coachingCard,
          seReflection: seReflection.trim(),
          transcript,
          isPractice: mode === "practice",
          attestationToken: mode === "submit" ? attestationToken : undefined,
          simulationContext: {
            persona: assignment.persona,
            vertical: assignment.vertical,
            solutionFocus: assignment.solutionFocus,
            difficulty: assignment.difficulty,
          },
        }),
      });

      if (!saveResponse.ok) {
        toast.error("Generated but could not save to database.");
        return;
      }

      const body = (await saveResponse.json()) as {
        practiceRoundsCompleted?: number;
      };

      if (mode === "practice") {
        const completed = body.practiceRoundsCompleted ?? practiceRoundsCompleted + 1;
        setPracticeRoundsCompleted(completed);
        toast.success("Practice round saved — coaching tips recorded. Run it again when ready.");
        setShowReflectionPrompt(false);
        await resetForNextRound();
        return;
      }

      toast.success("Submitted for manager review.");
      setShowReflectionPrompt(false);
    } catch (error) {
      toast.error("Could not save coaching card", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsGenerating(false);
    }
  }

  const roleplayEndedForInput = roleplayEnded && aiRoleplay && !isElevatorPitch;
  const personaInitials = initialsFromName(assignment.persona) || "AI";

  const roleplayPanel = (
    <div className={isEmbedded ? "border-0 shadow-none" : "overflow-hidden rounded-xl border border-[#e2eaf5] bg-white"}>
      {!isEmbedded ? (
        <div className="space-y-4 border-b border-sp-blue/10 bg-white p-6 pb-4">
          <div
            className="relative overflow-hidden rounded-[13px] p-[16px_20px]"
            style={{ background: "linear-gradient(135deg,#001228,#002060)" }}
          >
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#0071ce]/15" />
            <div className="absolute -bottom-10 left-16 h-20 w-20 rounded-full bg-[#cc27b0]/15" />
            <div className="relative flex items-center gap-[14px]">
              <div
                className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full text-[14px] font-extrabold text-white"
                style={{ background: "linear-gradient(135deg,#0033a1,#cc27b0)" }}
              >
                {personaInitials}
              </div>
              <div className="flex-1">
                <p className="text-[9.5px] font-bold uppercase tracking-[0.07em] text-white/40">
                  Current scenario · {assignment.vertical} vertical
                </p>
                <p className="font-display text-[14px] font-extrabold text-white">
                  {assignment.persona} · {assignment.solutionFocus}
                </p>
                <p className="mt-[1px] text-[11px] text-white/50">
                  {aiRoleplay ? "Live AI roleplay" : "Guided simulation"} ·{" "}
                  {difficultyToPromptLabel(assignment.difficulty)}
                </p>
              </div>
              <div className="rounded-lg bg-white/[0.07] p-[8px_12px] text-center">
                <p className="font-display text-[18px] font-extrabold leading-none text-white">
                  {messages.length}
                </p>
                <p className="text-[9px] text-white/40">turns</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {roleplayEnded ? <Badge tone="green">Debrief ready</Badge> : <Badge tone="amber">In progress</Badge>}
            {hasFormalAssignment && practiceRoundsRecommended > 0 ? (
              <Badge tone="slate">
                Practice {practiceRoundsCompleted}/{practiceRoundsRecommended} recommended
              </Badge>
            ) : null}
          </div>
          <SimulationStepStrip step={currentStep} />
          {showPreSessionRubric ? <SimulationRubricPanel criteria={rubricCriteria} /> : null}
        </div>
      ) : null}

      <div className={`flex flex-col ${isEmbedded ? "gap-4" : "min-h-[min(72vh,640px)]"}`}>
        <div
          className={`flex-1 space-y-3 overflow-y-auto p-4 ${
            isEmbedded ? "max-h-[min(50vh,28rem)] bg-sp-blue-soft/40" : "bg-sp-blue-soft/30"
          }`}
        >
          {isThinking && messages.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-sp-navy-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              {isEmbedded ? "Buyer is opening with the objection…" : "Opening persona card…"}
            </div>
          ) : null}
          {messages.map((message, index) => {
            const isSe = message.speaker === "se";
            const isCoach = message.speaker === "coach";
            const bubbleName = isSe ? "You" : isCoach ? "Coach" : assignment.persona;
            const avatarLabel = isSe ? "SE" : isCoach ? "AI" : personaInitials;

            return (
              <div
                className={isSe ? "flex items-start gap-[9px] justify-end" : "flex items-start gap-[9px]"}
                key={`${message.speaker}-${index}`}
              >
                <div
                  className={`flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                    isSe ? "order-2" : ""
                  }`}
                  style={{
                    background: isSe
                      ? "linear-gradient(135deg,#0033a1,#cc27b0)"
                      : isCoach
                        ? "linear-gradient(135deg,#cc27b0,#0071ce)"
                        : "linear-gradient(135deg,#0033a1,#0071ce)",
                  }}
                >
                  {avatarLabel}
                </div>
                <div
                  className={`max-w-[84%] rounded-[10px] border p-[10px_13px] ${
                    isSe ? "order-1 bg-white border-[#e2eaf5]" : "bg-[#f8fafd] border-[#e2eaf5]"
                  }`}
                >
                  <p className={`mb-[4px] text-[10px] font-semibold ${isSe ? "text-[#cc27b0]" : "text-[#0071ce]"}`}>
                    {bubbleName}
                  </p>
                  <p className="whitespace-pre-wrap text-[12px] leading-[1.6] text-[#374151]">{message.message}</p>
                </div>
              </div>
            );
          })}
          {coachingCard ? (
            <div className="space-y-2 pt-1">
              <div className="rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] p-[8px_10px]">
                <span className="text-[10px] font-bold text-[#15803d]">✓ Strong</span>
                <p className="text-[11px] leading-[1.5] text-[#374151]">
                  {coachingCard.strengths[0] ?? "Strong customer framing and value language."}
                </p>
              </div>
              <div className="rounded-lg border border-[#bfdbfe] bg-[#f0f7ff] p-[8px_10px]">
                <span className="text-[10px] font-bold text-[#1d4ed8]">→ Next move</span>
                <p className="text-[11px] leading-[1.5] text-[#374151]">
                  {coachingCard.recommendedImprovements[0] ?? coachingCard.recommendedNextPractice}
                </p>
              </div>
              <div className="rounded-lg border border-[#fde68a] bg-[#fef9ec] p-[8px_10px]">
                <span className="text-[10px] font-bold text-[#b45309]">⚠ Watch</span>
                <p className="text-[11px] leading-[1.5] text-[#374151]">
                  {coachingCard.gaps[0] ?? "Avoid overloading with features before confirming buyer pain."}
                </p>
              </div>
            </div>
          ) : null}
          {isThinking && messages.length > 0 ? (
            <div className="flex items-center gap-2 text-sm text-sp-navy-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Persona is responding…
            </div>
          ) : null}
          <div ref={transcriptEndRef} />
        </div>

        <div className="shrink-0 border-t border-sp-blue/10 bg-white p-4">
          <form className="space-y-3" onSubmit={form.handleSubmit(addTurn)}>
            {aiRoleplay ? (
              <SimulationSpeechInput
                disabled={isThinking || roleplayEndedForInput}
                onTranscript={(text) => {
                  const current = form.getValues("message");
                  form.setValue("message", current ? `${current} ${text}` : text, { shouldValidate: true });
                }}
              />
            ) : null}
            <Textarea
              className="min-h-[72px] resize-none"
              disabled={isThinking || roleplayEndedForInput}
              placeholder={
                roleplayEndedForInput
                  ? "Roleplay complete — generate coaching feedback below."
                  : isElevatorPitch
                    ? "Deliver your pitch… or use the mic."
                    : "Type your response… (HINT: for mid-call coaching)"
              }
              rows={2}
              {...form.register("message")}
            />
            <div className={isEmbedded ? "flex flex-col gap-2" : "flex flex-col gap-2 sm:flex-row"}>
              <button
                className={cn(SP_BLUE_BTN, isEmbedded ? "w-full" : "sm:flex-1")}
                disabled={isThinking || roleplayEndedForInput}
                type="submit"
              >
                <Send className="h-4 w-4 shrink-0" />
                Send
              </button>
              <button
                className={cn(SP_OUTLINE_BTN, isEmbedded ? "w-full" : "sm:flex-1")}
                disabled={isGenerating || messages.length < 2}
                onClick={generateCoachingCard}
                type="button"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 shrink-0" />
                )}
                {isEmbedded ? "Quick feedback" : "Get coaching feedback"}
              </button>
              {isEmbedded && onClose ? (
                <button className={cn(SP_OUTLINE_BTN, "w-full")} onClick={onClose} type="button">
                  Back to brief
                </button>
              ) : null}
            </div>
            {!isEmbedded && currentStep === 1 && messages.length > 0 ? (
              <p className="text-center text-[11px] text-stone-500">
                Tip: type <span className="font-semibold">HINT:</span> anytime for coaching mid-call
              </p>
            ) : null}
          </form>
        </div>
      </div>

      {isEmbedded && coachingCard ? (
        <div className="space-y-3 border-t border-sp-blue/10 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-sp-navy">Quick coaching feedback</p>
            <p className="text-2xl font-bold text-sp-navy">{coachingCard.score}</p>
          </div>
          <ul className="list-disc space-y-1 pl-5 text-sm text-sp-navy-muted">
            {coachingCard.recommendedImprovements.slice(0, 2).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="text-sm text-sp-navy-muted">{coachingCard.recommendedNextPractice}</p>
        </div>
      ) : null}
    </div>
  );

  if (isEmbedded) {
    return roleplayPanel;
  }

  return (
    <div className="space-y-4">
      {hasFormalAssignment ? (
        <div className="rounded-xl border border-sp-blue/15 bg-sp-blue-soft/30 px-4 py-3 text-sm text-sp-navy">
          <p className="font-semibold text-sp-navy">Formal simulation</p>
          <p className="mt-1 text-sp-navy-muted">
            This counts toward your ramp and manager review. Practice rounds are optional but recommended
            {belowPracticeRecommendation ? ` (${practiceRemaining} more recommended)` : ""}.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-700">
          <p className="font-semibold">Practice mode</p>
          <p className="mt-1 text-stone-600">Open practice — does not submit to your manager until you run a formal assignment.</p>
        </div>
      )}

      {roleplayPanel}

      <div className="rounded-2xl border border-sp-magenta/15 bg-white">
        <button
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          onClick={() => setShowCoachingPanel((open) => !open)}
          type="button"
        >
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-sp-magenta" />
            <div>
              <p className="text-sm font-semibold text-sp-navy">Coaching feedback</p>
              <p className="text-xs text-sp-navy-muted">
                {coachingCard
                  ? `Score ${coachingCard.score} — add reflection and submit`
                  : "Opens after you generate coaching feedback"}
              </p>
            </div>
          </div>
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-stone-400 transition ${showCoachingPanel ? "rotate-180" : ""}`}
          />
        </button>

        {showCoachingPanel ? (
          <div className="border-t border-sp-magenta/10 px-4 pb-4 pt-2">
            {coachingCard ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold text-sp-navy">{coachingCard.score}</p>
                  <Badge tone={showReflectionPrompt ? "blue" : "amber"}>
                    {showReflectionPrompt ? "Add reflection" : "Review tips"}
                  </Badge>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm font-semibold text-sp-navy">Strengths</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-500">
                      {coachingCard.strengths.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-sp-navy">Gaps</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-500">
                      {coachingCard.gaps.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <p className="rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-800">
                  {coachingCard.managerSummary}
                </p>
                {showReflectionPrompt ? (
                  <div className="space-y-3 border-t border-sp-blue/10 pt-4">
                    <p className="text-sm font-semibold text-sp-navy">Your reflection</p>
                    <Textarea
                      onChange={(e) => setSeReflection(e.target.value)}
                      placeholder="What will you do differently on your next call?"
                      rows={3}
                      value={seReflection}
                    />
                    {belowPracticeRecommendation ? (
                      <p className="text-xs text-stone-600">
                        Manager recommends {practiceRoundsRecommended} practice round
                        {practiceRoundsRecommended === 1 ? "" : "s"} — you can submit now or practice{" "}
                        {practiceRemaining} more time{practiceRemaining === 1 ? "" : "s"} first.
                      </p>
                    ) : null}
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        className={SP_OUTLINE_BTN}
                        disabled={isGenerating}
                        onClick={() => void saveCoachingCard("practice")}
                        type="button"
                      >
                        {isGenerating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4" />
                        )}
                        Practice again
                      </button>
                      <button
                        className={SP_BLUE_BTN}
                        disabled={isGenerating}
                        onClick={() => void saveCoachingCard("submit")}
                        type="button"
                      >
                        Submit for manager review
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-slate-500">
                Finish a few turns, then tap <span className="font-semibold">Get coaching feedback</span> above.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
