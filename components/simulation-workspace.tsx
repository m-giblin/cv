"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Bot, Loader2, MessageSquareText, RotateCcw, Send, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { coachingCardSchema, type CoachingCardOutput } from "@/lib/ai/schemas";
import { difficultyToPromptLabel, isElevatorPitchTemplate } from "@/lib/simulations/prompt-template";
import { SimulationSpeechInput } from "@/components/simulation/speech-input";
import { SimulationAssignment } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  message: z.string().min(1, "Add a response for the persona."),
});

type TranscriptEntry = SimulationAssignment["transcript"][number];

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
}: {
  assignment: SimulationAssignment;
  userLevel?: "Basic" | "Senior" | "Advisory";
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
  const startedRef = useRef(false);

  const practiceRoundsRequired = assignment.practiceRoundsRequired ?? 1;
  const hasFormalAssignment = !assignment.id.startsWith("practice");
  const canSubmitForReview =
    !hasFormalAssignment || practiceRoundsRequired === 0 || practiceRoundsCompleted >= practiceRoundsRequired;
  const practiceRemaining = Math.max(0, practiceRoundsRequired - practiceRoundsCompleted);

  const aiRoleplay = assignment.aiRoleplay ?? Boolean(assignment.promptSnapshot);
  const promptSnapshot = assignment.promptSnapshot;
  const startMessage = assignment.startMessage;
  const isElevatorPitch = promptSnapshot ? isElevatorPitchTemplate(promptSnapshot) : false;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { message: "" },
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

      const payload = (await response.json()) as { object: unknown };
      const parsed = coachingCardSchema.parse(payload.object);
      setCoachingCard(parsed);
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

    if (mode === "submit" && !canSubmitForReview) {
      toast.error(`Complete ${practiceRemaining} more practice round${practiceRemaining === 1 ? "" : "s"} before submitting.`);
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

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-sp-blue" />
            {aiRoleplay ? "Live AI roleplay" : `${assignment.persona} simulation`}
          </CardTitle>
          <CardDescription>
            {assignment.solutionFocus} • {assignment.vertical} •{" "}
            {difficultyToPromptLabel(assignment.difficulty)}
            {aiRoleplay ? " • Type HINT: for a coaching tip mid-call" : null}
            {isElevatorPitch ? " • Deliver pitches out loud with the mic" : null}
          </CardDescription>
        </CardHeader>
        <div className="space-y-4">
          <div className="max-h-[520px] space-y-3 overflow-y-auto rounded-2xl bg-sp-blue-soft/40 p-4">
            {isThinking && messages.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-sp-navy-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating persona card and opening move…
              </div>
            ) : null}
            {messages.map((message, index) => (
              <div
                className={
                  message.speaker === "se"
                    ? "ml-auto max-w-[85%] rounded-2xl bg-gradient-to-br from-sp-blue to-sp-blue-deep p-4 text-white"
                    : message.speaker === "coach"
                      ? "max-w-[90%] rounded-2xl border border-sp-magenta/20 bg-sp-magenta/5 p-4 text-sp-navy-muted"
                      : "max-w-[85%] rounded-2xl bg-white p-4 text-sp-navy-muted shadow-sm"
                }
                key={`${message.speaker}-${index}`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
                  {message.speaker === "se"
                    ? "SE"
                    : message.speaker === "coach"
                      ? "Coach / Debrief"
                      : assignment.persona}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{message.message}</p>
              </div>
            ))}
            {isThinking && messages.length > 0 ? (
              <div className="flex items-center gap-2 text-sm text-sp-navy-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Persona is responding…
              </div>
            ) : null}
          </div>
          <form className="space-y-3" onSubmit={form.handleSubmit(addTurn)}>
            {aiRoleplay ? (
              <SimulationSpeechInput
                disabled={isThinking || (roleplayEnded && aiRoleplay && !isElevatorPitch)}
                onTranscript={(text) => {
                  const current = form.getValues("message");
                  form.setValue("message", current ? `${current} ${text}` : text, { shouldValidate: true });
                }}
              />
            ) : null}
            <Textarea
              disabled={isThinking || (roleplayEnded && aiRoleplay && !isElevatorPitch)}
              placeholder={
                roleplayEnded && !isElevatorPitch
                  ? "Roleplay complete — review the debrief above."
                  : isElevatorPitch
                    ? "Deliver your elevator pitch… or use the mic above."
                    : "Respond to the persona… (prefix with HINT: for coaching)"
              }
              {...form.register("message")}
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                className="flex-1"
                disabled={isThinking || (roleplayEnded && aiRoleplay && !isElevatorPitch)}
                type="submit"
              >
                <Send className="h-4 w-4" />
                Send turn
              </Button>
              <Button
                className="flex-1"
                disabled={isGenerating || messages.length < 2}
                onClick={generateCoachingCard}
                type="button"
                variant="secondary"
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate coaching card
              </Button>
            </div>
          </form>
        </div>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Simulation brief</CardTitle>
            <CardDescription>
              {aiRoleplay
                ? "Matt's SLED roleplay prompt — persona, difficulty behavior, roleplay, and auto-debrief are driven by AI."
                : "Legacy canned simulation mode."}
            </CardDescription>
          </CardHeader>
          <div className="space-y-2 text-sm text-sp-navy-muted">
            <p>
              <span className="font-semibold text-sp-navy">Solution:</span> {assignment.solutionFocus}
            </p>
            <p>
              <span className="font-semibold text-sp-navy">Vertical:</span> {assignment.vertical}
            </p>
            <p>
              <span className="font-semibold text-sp-navy">Difficulty:</span>{" "}
              {difficultyToPromptLabel(assignment.difficulty)}
            </p>
            {roleplayEnded ? (
              <Badge tone="green">Debrief complete — save coaching feedback below</Badge>
            ) : (
              <Badge tone="blue">In progress</Badge>
            )}
            {hasFormalAssignment ? (
              <p className="text-sm text-sp-navy-muted">
                Practice rounds:{" "}
                <span className="font-semibold text-sp-navy">{practiceRoundsCompleted}</span>
                {practiceRoundsRequired > 0 ? (
                  <>
                    {" "}
                    / {practiceRoundsRequired} recommended before submit
                  </>
                ) : (
                  " — submit anytime"
                )}
              </p>
            ) : null}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-sp-magenta" />
              Coaching card preview
            </CardTitle>
            <CardDescription>
              After the debrief, save coaching feedback — practice as many times as you need, then submit for review.
            </CardDescription>
          </CardHeader>
          {coachingCard ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-sp-navy">{coachingCard.score}</p>
                <Badge tone={showReflectionPrompt ? "blue" : "amber"}>
                  {showReflectionPrompt ? "Ready to save" : "Review coaching tips"}
                </Badge>
              </div>
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
              <p className="rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-800">
                {coachingCard.managerSummary}
              </p>
              {showReflectionPrompt ? (
                <div className="space-y-3 border-t border-sp-blue/10 pt-4">
                  <p className="text-sm font-semibold text-sp-navy">Your reflection</p>
                  <Textarea
                    onChange={(e) => setSeReflection(e.target.value)}
                    placeholder="What will you do differently on your next call?"
                    rows={4}
                    value={seReflection}
                  />
                  {!canSubmitForReview && hasFormalAssignment ? (
                    <p className="text-xs text-amber-800">
                      Complete {practiceRemaining} more practice round{practiceRemaining === 1 ? "" : "s"} to unlock
                      manager submission.
                    </p>
                  ) : null}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      disabled={isGenerating}
                      onClick={() => void saveCoachingCard("practice")}
                      type="button"
                      variant="outline"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                      Save as practice & try again
                    </Button>
                    <Button
                      disabled={isGenerating || !canSubmitForReview}
                      onClick={() => void saveCoachingCard("submit")}
                      type="button"
                    >
                      Submit for manager review
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              Complete the roleplay — generate coaching tips, practice if you need to, then submit when ready.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
