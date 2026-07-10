"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Send, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { coachingCardSchema, type CoachingCardOutput } from "@/lib/ai/schemas";
import { difficultyToPromptLabel, isElevatorPitchTemplate } from "@/lib/simulations/prompt-template";
import { simulationRubricCriteria } from "@/lib/simulations/session-rubric";
import { SimulationCoachingRail } from "@/components/simulation/simulation-coaching-rail";
import { SimulationScenarioBrief } from "@/components/simulation/simulation-scenario-brief";
import { SimulationSpeechInput } from "@/components/simulation/speech-input";
import { SP_BLUE_BTN, SP_OUTLINE_BTN } from "@/components/se/sp-form-primitives";
import { SimulationAssignment } from "@/lib/types";
import { Textarea } from "@/components/ui/textarea";
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

export function SimulationWorkspace({
  assignment,
  userLevel = "Basic",
  variant = "full",
  onClose,
  onStepChange,
}: {
  assignment: SimulationAssignment;
  userLevel?: "Basic" | "Senior" | "Advisory";
  variant?: "full" | "embedded";
  onClose?: () => void;
  onStepChange?: (step: 1 | 2 | 3) => void;
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

  useEffect(() => {
    onStepChange?.(currentStep);
  }, [currentStep, onStepChange]);

  const isObjectionPractice = assignment.persona.toLowerCase().includes("objection practice");
  const rubricCriteria = simulationRubricCriteria({
    isElevatorPitch,
    isObjectionPractice,
    persona: assignment.persona,
  });

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
      const body = (await response.json().catch(() => null)) as { error?: string | { formErrors?: string[] } } | null;
      const apiError =
        typeof body?.error === "string"
          ? body.error
          : body?.error && typeof body.error === "object" && body.error.formErrors?.[0]
            ? body.error.formErrors[0]
            : null;
      throw new Error(apiError ?? "Simulation turn failed");
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
      const nextMessages: TranscriptEntry[] = [{ speaker: payload.speaker, message: payload.response }];
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

      const body = (await saveResponse.json()) as { practiceRoundsCompleted?: number };

      if (mode === "practice") {
        const completed = body.practiceRoundsCompleted ?? practiceRoundsCompleted + 1;
        setPracticeRoundsCompleted(completed);
        toast.success("Practice round saved — run it again when ready.");
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

  const chatMessages = (
    <div className="flex-1 space-y-3 overflow-y-auto p-4">
      {isThinking && messages.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-[#6B6860]">
          <Loader2 className="h-4 w-4 animate-spin" />
          {isEmbedded ? "Buyer is opening with the objection…" : "Opening persona…"}
        </div>
      ) : null}
      {messages.map((message, index) => {
        const isSe = message.speaker === "se";
        const isCoach = message.speaker === "coach";
        const avatarLabel = isSe ? "SE" : isCoach ? "AI" : personaInitials;

        if (isSe) {
          return (
            <div className="flex justify-end" key={`${message.speaker}-${index}`}>
              <div className="max-w-[78%] border border-[rgba(0,113,206,.15)] bg-[#EEF4FF] p-[10px_13px]">
                <p className="text-[11.5px] leading-[1.65] text-[#0D0E12]">{message.message}</p>
              </div>
            </div>
          );
        }

        return (
          <div className="flex gap-[9px]" key={`${message.speaker}-${index}`}>
            <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center bg-[#E2DFD9] font-mono text-[9px] text-[#6B6860]">
              {avatarLabel}
            </div>
            <div className="max-w-[78%] bg-[#F5F4F0] p-[10px_13px]">
              <p className="text-[11.5px] leading-[1.65] text-[#1A1A1A]">{message.message}</p>
            </div>
          </div>
        );
      })}
      {isThinking && messages.length > 0 ? (
        <div className="flex items-center gap-2 text-sm text-[#6B6860]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Persona is responding…
        </div>
      ) : null}
      <div ref={transcriptEndRef} />
    </div>
  );

  const chatInput = (
    <div className="shrink-0 border-t border-[#ECEAE6] bg-white p-3">
      <form className="space-y-2" onSubmit={form.handleSubmit(addTurn)}>
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
          className="min-h-[64px] resize-none border-[#D4D1CB] text-[12px]"
          disabled={isThinking || roleplayEndedForInput}
          placeholder={
            roleplayEndedForInput
              ? "Roleplay complete — end session for feedback."
              : "Type your response… (HINT: for mid-call coaching)"
          }
          rows={2}
          {...form.register("message")}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            className={cn(SP_BLUE_BTN, "flex-1 sm:flex-none")}
            disabled={isThinking || roleplayEndedForInput}
            type="submit"
          >
            <Send className="h-4 w-4 shrink-0" />
            Send
          </button>
          <button
            className={cn(SP_OUTLINE_BTN, "flex-1 sm:flex-none")}
            disabled={isGenerating || messages.length < 2}
            onClick={generateCoachingCard}
            type="button"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 shrink-0" />
            )}
            {coachingCard ? "Regenerate feedback" : "End & get feedback"}
          </button>
          {isEmbedded && onClose ? (
            <button className={SP_OUTLINE_BTN} onClick={onClose} type="button">
              Back to brief
            </button>
          ) : null}
        </div>
        {!isEmbedded && currentStep === 1 && messages.length > 0 ? (
          <p className="text-center text-[10px] text-[#A09D98]">
            Tip: type <span className="font-semibold">HINT:</span> for mid-call coaching
          </p>
        ) : null}
      </form>
    </div>
  );

  if (isEmbedded) {
    return (
      <div className="overflow-hidden border border-[#E2DFD9] bg-white">
        <div className="flex min-h-[min(50vh,28rem)] flex-col">
          {chatMessages}
          {chatInput}
        </div>
        {coachingCard ? (
          <div className="border-t border-[#ECEAE6] p-4">
            <p className="text-sm font-bold text-[#0D0E12]">Score {coachingCard.score}</p>
            <p className="mt-1 text-sm text-[#6B6860]">{coachingCard.recommendedNextPractice}</p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden border-0 bg-white lg:grid-cols-[280px_1fr_260px]">
        <SimulationScenarioBrief assignment={assignment} criteria={rubricCriteria} turnCount={messages.length} />

        <section className="flex min-h-0 min-w-0 flex-col border-b border-[#E2DFD9] lg:border-b-0">
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#ECEAE6] bg-white px-4 py-3">
            <div className="min-w-0">
              <p className="truncate font-display text-[13px] font-extrabold text-[#0D0E12]">{assignment.persona}</p>
              <p className="flex items-center gap-1.5 text-[10px] text-[#6B6860]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#10b981] animate-pulse" />
                Live session · {aiRoleplay ? "AI persona active" : "Guided"} ·{" "}
                {difficultyToPromptLabel(assignment.difficulty)}
            </p>
          </div>
        </header>
        {chatMessages}
          {chatInput}
        </section>

        <SimulationCoachingRail
          belowPracticeRecommendation={belowPracticeRecommendation}
          coachingCard={coachingCard}
          criteria={rubricCriteria}
          isGenerating={isGenerating}
          messages={messages}
          onPracticeAgain={() => void saveCoachingCard("practice")}
          onReflectionChange={setSeReflection}
          onSubmit={() => void saveCoachingCard("submit")}
          practiceRemaining={practiceRemaining}
          practiceRoundsRecommended={practiceRoundsRecommended}
          seReflection={seReflection}
          showReflectionPrompt={showReflectionPrompt}
        />
      </div>
    </div>
  );
}
