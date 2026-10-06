"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { SaveChallengeButton } from "@/components/admin/admin-tools";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { generatedChallengeSchema, type GeneratedChallenge } from "@/lib/ai/schemas";

const formSchema = z.object({
 level: z.enum(["Basic", "Senior", "Advisory"]),
 topic: z.string().min(2, "Choose a topic or solution area"),
 difficulty: z.enum(["foundational", "intermediate", "advanced"]),
 recentActivity: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

export function ChallengeGenerator({ showSave = false }: { showSave?: boolean }) {
 const [challenge, setChallenge] = useState<GeneratedChallenge | null>(null);
 const [isGenerating, setIsGenerating] = useState(false);
 const form = useForm<FormValues>({
 resolver: zodResolver(formSchema),
 defaultValues: {
 level: "Basic",
 topic: "",
 difficulty: "intermediate",
 recentActivity: "",
 },
 });

 async function onSubmit(values: FormValues) {
 setIsGenerating(true);

 try {
 const response = await fetch("/api/ai/challenges", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify(values),
 });

 if (!response.ok) {
 throw new Error("Challenge generation failed");
 }

 const payload = await response.json() as { object: unknown };
 const parsed = generatedChallengeSchema.parse(payload.object);
 setChallenge(parsed);
 toast.success("Challenge generated", {
 description: "Structured output is ready to save or assign.",
 });
 } catch (error) {
 toast.error("Could not generate challenge", {
 description: error instanceof Error ? error.message : "Please try again.",
 });
 } finally {
 setIsGenerating(false);
 }
 }

 return (
 <div className="grid min-w-0 gap-6 lg:grid-cols-2">
 <Card>
 <CardHeader>
 <CardTitle>Generate a challenge</CardTitle>
 <CardDescription>
 Personalize by SE level, solution area, difficulty, and recent progress context.
 </CardDescription>
 </CardHeader>
 <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
 <label className="block space-y-1.5 text-sm font-semibold text-ink">
 SE level
 <select
 className="h-10 w-full rounded-[10px] border border-line-strong bg-white px-3 text-[15px] text-ink focus:border-blue"
 {...form.register("level")}
 >
 <option>Basic</option>
 <option>Senior</option>
 <option>Advisory</option>
 </select>
 </label>
 <label className="block space-y-1.5 text-sm font-semibold text-ink">
 Topic or solution area
 <Input placeholder="For example, access review discovery" {...form.register("topic")} />
 {form.formState.errors.topic ? (
 <span className="block text-[13px] font-semibold text-danger" role="alert">
 {form.formState.errors.topic.message}
 </span>
 ) : null}
 </label>
 <label className="block space-y-1.5 text-sm font-semibold text-ink">
 Difficulty
 <select
 className="h-10 w-full rounded-[10px] border border-line-strong bg-white px-3 text-[15px] text-ink focus:border-blue"
 {...form.register("difficulty")}
 >
 <option value="foundational">Foundational</option>
 <option value="intermediate">Intermediate</option>
 <option value="advanced">Advanced</option>
 </select>
 </label>
 <label className="block space-y-1.5 text-sm font-semibold text-ink">
 Recent activity context
 <Textarea placeholder="What the SE has worked on lately (optional)" {...form.register("recentActivity")} />
 </label>
 <Button className="w-full" disabled={isGenerating} type="submit" variant="primary">
 {isGenerating ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
 {isGenerating ? "Generating…" : "Generate challenge"}
 </Button>
 </form>
 </Card>

 <Card>
 <CardHeader>
 <CardTitle>{challenge?.title ?? "Preview"}</CardTitle>
 <CardDescription>
 {challenge?.description ?? "Review the challenge here before you save or assign it."}
 </CardDescription>
 </CardHeader>
 {challenge ? (
 <div className="space-y-5">
 <div>
 <p className="text-sm font-semibold text-ink">Steps</p>
 <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-6 text-ink-2">
 {challenge.steps.map((step) => <li key={step}>{step}</li>)}
 </ol>
 </div>
 <div>
 <p className="text-sm font-semibold text-ink">Success criteria</p>
 <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-ink-2">
 {challenge.successCriteria.map((criterion) => <li key={criterion}>{criterion}</li>)}
 </ul>
 </div>
 <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-[10px] border border-line bg-bg p-4 text-sm">
 <dt className="text-muted">Time</dt>
 <dd className="num font-semibold text-ink">About {challenge.estimatedMinutes} min</dd>
 <dt className="text-muted">Difficulty</dt>
 <dd className="font-semibold text-ink capitalize">{challenge.difficulty}</dd>
 {challenge.linkedSolutions.length > 0 ? (
 <>
 <dt className="text-muted">Solutions</dt>
 <dd className="font-semibold text-ink">{challenge.linkedSolutions.join(", ")}</dd>
 </>
 ) : null}
 </dl>
 {showSave ? <SaveChallengeButton challenge={challenge} /> : null}
 </div>
 ) : (
 <div className="rounded-[12px] border border-dashed border-line-strong p-8 text-center text-sm text-muted">
 Fill in the form and generate. The challenge appears here.
 </div>
 )}
 </Card>
 </div>
 );
}
