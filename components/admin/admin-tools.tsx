"use client";

import { Loader2, Save, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { GeneratedChallenge } from "@/lib/ai/schemas";
import { SIMULATION_TEMPLATE_PRESETS } from "@/lib/simulations/template-presets";

export function SaveChallengeButton({ challenge }: { challenge: GeneratedChallenge }) {
 const [isSaving, setIsSaving] = useState(false);

 async function save() {
 setIsSaving(true);
 const response = await fetch("/api/challenges", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify(challenge),
 });

 if (!response.ok) {
 toast.error("Could not save challenge to library.");
 setIsSaving(false);
 return;
 }

 toast.success("Challenge saved to library.");
 setIsSaving(false);
 }

 return (
 <Button disabled={isSaving} onClick={() => void save()} size="sm" variant="outline">
 {isSaving ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Save aria-hidden className="h-4 w-4" />}
 Save to library
 </Button>
 );
}

export function SimulationTemplateForm() {
 const [name, setName] = useState("");
 const [persona, setPersona] = useState("Dynamic (AI-generated buyer)");
 const [vertical, setVertical] = useState("SLED");
 const [solutionFocus, setSolutionFocus] = useState("SailPoint Agent Identity Security (AIS)");
 const [prompt, setPrompt] = useState("");
 const [isSaving, setIsSaving] = useState(false);

 async function handleSubmit(event: React.FormEvent) {
 event.preventDefault();
 setIsSaving(true);

 const response = await fetch("/api/admin/simulation-templates", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ name, persona, vertical, solutionFocus, promptBody: prompt }),
 });

 if (!response.ok) {
 toast.error("Failed to save template.");
 setIsSaving(false);
 return;
 }

 toast.success("Simulation template saved.");
 setName("");
 setPersona("");
 setVertical("");
 setPrompt("");
 setIsSaving(false);
 }

 function loadPreset(key: keyof typeof SIMULATION_TEMPLATE_PRESETS) {
 const preset = SIMULATION_TEMPLATE_PRESETS[key];
 setName(preset.name);
 setPersona(preset.persona);
 setVertical(preset.vertical);
 setSolutionFocus(preset.solutionFocus);
 setPrompt(preset.promptBody);
 }

 async function handlePromptFile(event: React.ChangeEvent<HTMLInputElement>) {
 const file = event.target.files?.[0];
 if (!file) return;

 const text = await file.text();
 setPrompt(text);
 toast.success("Prompt loaded from file. Review it, then save.");
 }

 return (
 <form className="space-y-4" onSubmit={handleSubmit}>
 <div className="flex flex-wrap gap-2">
 <Button onClick={() => loadPreset("sledRoleplay")} size="sm" type="button" variant="outline">
 Load SLED roleplay preset
 </Button>
 <Button onClick={() => loadPreset("elevatorPitch")} size="sm" type="button" variant="outline">
 Load elevator pitch preset
 </Button>
 </div>
 <Input aria-label="Template name" onChange={(event) => setName(event.target.value)} placeholder="Template name" required value={name} />
 <Input aria-label="Persona" onChange={(event) => setPersona(event.target.value)} placeholder="Persona (e.g. Healthcare CISO)" required value={persona} />
 <Input aria-label="Default vertical" onChange={(event) => setVertical(event.target.value)} placeholder="Default vertical" required value={vertical} />
 <Input aria-label="Default solution" onChange={(event) => setSolutionFocus(event.target.value)} placeholder="Default solution" required value={solutionFocus} />
 <Textarea
 aria-label="Prompt body"
 className="min-h-[240px] text-sm"
 onChange={(event) => setPrompt(event.target.value)}
 placeholder="Prompt body. Use {{solution}}, {{vertical}} and {{difficulty}} where managers should set values when they assign it."
 required
 value={prompt}
 />
 <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-full text-sm font-semibold text-ink-2 hover:text-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue">
 <Upload aria-hidden className="h-4 w-4" />
 Upload a prompt from a .txt file
 <input accept=".txt,.md" className="sr-only" onChange={(event) => void handlePromptFile(event)} type="file" />
 </label>
 <p className="text-[13px] text-muted">
 Templates save to the database straight away, with no SQL needed. Managers see new templates on the Simulations assign form.
 </p>
 <Button disabled={isSaving} type="submit" variant="primary">
 {isSaving ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
 Save template
 </Button>
 </form>
 );
}

export function ContentAssetForm() {
 const [title, setTitle] = useState("");
 const [url, setUrl] = useState("");
 const [file, setFile] = useState<File | null>(null);
 const [category, setCategory] = useState("solution_brief");
 const [isSaving, setIsSaving] = useState(false);

 async function handleSubmit(event: React.FormEvent) {
 event.preventDefault();
 setIsSaving(true);

 if (file) {
 const formData = new FormData();
 formData.set("title", title || file.name);
 formData.set("category", category);
 formData.set("file", file);

 const response = await fetch("/api/admin/content-assets/upload", {
 method: "POST",
 body: formData,
 });

 if (!response.ok) {
 toast.error("Failed to upload content file.");
 setIsSaving(false);
 return;
 }

 toast.success("Content file uploaded.");
 setTitle("");
 setFile(null);
 setIsSaving(false);
 return;
 }

 const response = await fetch("/api/admin/content-assets", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ title, url, category }),
 });

 if (!response.ok) {
 toast.error("Failed to save content asset.");
 setIsSaving(false);
 return;
 }

 toast.success("Content asset saved.");
 setTitle("");
 setUrl("");
 setIsSaving(false);
 }

 return (
 <form className="space-y-4" onSubmit={handleSubmit}>
 <Input aria-label="Title" onChange={(event) => setTitle(event.target.value)} placeholder="Title" value={title} />
 <Input
 aria-label="URL"
 onChange={(event) => setUrl(event.target.value)}
 placeholder="URL of a deck, brief or video, or upload a file below"
 required={!file}
 type="url"
 value={url}
 />
 <Input
 aria-label="Upload content file"
 accept=".pdf,.ppt,.pptx,.doc,.docx,.mp4,.mov"
 onChange={(event) => setFile(event.target.files?.[0] ?? null)}
 type="file"
 />
 <select
 aria-label="Category"
 className="h-10 w-full rounded-[10px] border border-line-strong bg-white px-3 text-[15px] text-ink"
 onChange={(event) => setCategory(event.target.value)}
 value={category}
 >
 <option value="solution_brief">Solution brief</option>
 <option value="pitch_deck">Pitch deck</option>
 <option value="demo_recording">Demo recording</option>
 <option value="reference">Reference</option>
 </select>
 <Button disabled={isSaving} type="submit" variant="primary">
 {isSaving ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
 Save asset
 </Button>
 </form>
 );
}
