"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Sparkles } from "lucide-react";
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
 topic: "Shadow AI risk discovery",
 difficulty: "intermediate",
 recentActivity: "Recently submitted Entra ID connector walkthrough and needs practice asking discovery questions.",
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
 <form className="space-y-4 px-6 pb-6" onSubmit={form.handleSubmit(onSubmit)}>
 <label className="block space-y-2 text-sm font-medium text-slate-700">
 SE level
 <select
 className="h-10 w-full border border-slate-200 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
 {...form.register("level")}
 >
 <option>Basic</option>
 <option>Senior</option>
 <option>Advisory</option>
 </select>
 </label>
 <label className="block space-y-2 text-sm font-medium text-slate-700">
 Topic or solution area
 <Input {...form.register("topic")} />
 </label>
 <label className="block space-y-2 text-sm font-medium text-slate-700">
 Difficulty
 <select
 className="h-10 w-full border border-slate-200 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
 {...form.register("difficulty")}
 >
 <option value="foundational">Foundational</option>
 <option value="intermediate">Intermediate</option>
 <option value="advanced">Advanced</option>
 </select>
 </label>
 <label className="block space-y-2 text-sm font-medium text-slate-700">
 Recent activity context
 <Textarea {...form.register("recentActivity")} />
 </label>
 <Button className="w-full" disabled={isGenerating} type="submit">
 {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
 Generate structured challenge
 </Button>
 </form>
 </Card>

 <Card>
 <CardHeader>
 <CardTitle>{challenge?.title ?? "Generated challenge preview"}</CardTitle>
 <CardDescription>
 {challenge?.description ?? "Generated output will appear here and can be persisted to Supabase as an AI-generated challenge."}
 </CardDescription>
 </CardHeader>
 {challenge ? (
 <div className="space-y-5 px-6 pb-6">
 <div>
 <p className="text-sm font-semibold text-sp-navy">Steps</p>
 <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-500">
 {challenge.steps.map((step) => <li key={step}>{step}</li>)}
 </ol>
 </div>
 <div>
 <p className="text-sm font-semibold text-sp-navy">Success criteria</p>
 <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-500">
 {challenge.successCriteria.map((criterion) => <li key={criterion}>{criterion}</li>)}
 </ul>
 </div>
 <div className="bg-slate-50 p-4 text-sm text-slate-600">
 {challenge.estimatedMinutes} minutes • {challenge.difficulty} • {challenge.linkedSolutions.join(", ")}
 </div>
 {showSave ? <SaveChallengeButton challenge={challenge} /> : null}
 </div>
 ) : (
 <div className="mx-6 mb-6 border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
 Submit the form to call the structured AI endpoint.
 </div>
 )}
 </Card>
 </div>
 );
}
