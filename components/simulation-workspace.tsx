"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Bot, Loader2, MessageSquareText, Send, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { coachingCardSchema, type CoachingCardOutput } from "@/lib/ai/schemas";
import { SimulationAssignment } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  message: z.string().min(4, "Add a response for the persona."),
});

export function SimulationWorkspace({ assignment }: { assignment: SimulationAssignment }) {
  const [messages, setMessages] = useState(assignment.transcript);
  const [coachingCard, setCoachingCard] = useState<CoachingCardOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "I would like to understand who owns AI tool approval policy and how you currently certify access to sensitive clinical data.",
    },
  });

  const transcript = useMemo(
    () => messages.map((message) => `${message.speaker === "persona" ? assignment.persona : "SE"}: ${message.message}`).join("\n"),
    [assignment.persona, messages],
  );

  function addTurn(values: z.infer<typeof formSchema>) {
    const personaPushbacks = [
      "That sounds reasonable, but my team already has policy documents. What evidence would SailPoint give me that the policy is actually being followed?",
      "We are trying to avoid another long implementation. How would this help us show audit progress quickly?",
      "Our data owners do not want more review work. How would you keep certifications targeted and useful?",
    ];
    const nextPersonaMessage = personaPushbacks[messages.length % personaPushbacks.length];

    setMessages((current) => [
      ...current,
      { speaker: "se", message: values.message },
      { speaker: "persona", message: nextPersonaMessage },
    ]);
    form.reset({ message: "" });
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
          level: "Basic",
          transcript,
        }),
      });

      if (!response.ok) {
        throw new Error("Coaching card generation failed");
      }

      const payload = await response.json() as { object: unknown };
      const parsed = coachingCardSchema.parse(payload.object);
      setCoachingCard(parsed);
      toast.success("Coaching card generated", {
        description: "The structured card is ready to route to the manager.",
      });
    } catch (error) {
      toast.error("Could not generate coaching card", {
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
            <Bot className="h-5 w-5 text-blue-600" />
            {assignment.persona} simulation
          </CardTitle>
          <CardDescription>
            {assignment.vertical} • {assignment.solutionFocus} • {assignment.difficulty}
          </CardDescription>
        </CardHeader>
        <div className="space-y-4">
          <div className="max-h-[520px] space-y-3 overflow-y-auto rounded-2xl bg-slate-50 p-4">
            {messages.map((message, index) => (
              <div
                className={message.speaker === "se" ? "ml-auto max-w-[85%] rounded-2xl bg-blue-600 p-4 text-white" : "max-w-[85%] rounded-2xl bg-white p-4 text-slate-700 shadow-sm"}
                key={`${message.speaker}-${index}`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
                  {message.speaker === "se" ? "SE" : assignment.persona}
                </p>
                <p className="mt-2 text-sm leading-6">{message.message}</p>
              </div>
            ))}
          </div>
          <form className="space-y-3" onSubmit={form.handleSubmit(addTurn)}>
            <Textarea placeholder="Respond to the persona..." {...form.register("message")} />
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button className="flex-1" type="submit">
                <Send className="h-4 w-4" />
                Send turn
              </Button>
              <Button className="flex-1" disabled={isGenerating} onClick={generateCoachingCard} type="button" variant="secondary">
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
            <CardTitle>Prompt module</CardTitle>
            <CardDescription>Admin-configurable persona prompt shell for Matt&apos;s existing simulation prompts.</CardDescription>
          </CardHeader>
          <div className="space-y-4">
            <label className="block space-y-2 text-sm font-medium text-slate-700">
              Persona
              <Input defaultValue={assignment.persona} />
            </label>
            <label className="block space-y-2 text-sm font-medium text-slate-700">
              Prompt guidance
              <Textarea defaultValue={`Stay in character as a ${assignment.persona}. Push back on unsupported claims. Ask for concrete identity security outcomes, audit evidence, and implementation tradeoffs.`} />
            </label>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-blue-600" />
              Coaching card preview
            </CardTitle>
            <CardDescription>Generated cards route to the assigned manager and write timeline events.</CardDescription>
          </CardHeader>
          {coachingCard ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-slate-950">{coachingCard.score}</p>
                <Badge tone="amber">pending manager review</Badge>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-950">Strengths</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-500">
                  {coachingCard.strengths.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-950">Gaps</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-500">
                  {coachingCard.gaps.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
              <p className="rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-800">
                {coachingCard.managerSummary}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              Complete a few turns, then generate a structured coaching card.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
