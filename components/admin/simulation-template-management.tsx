"use client";

import { Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { GlobalAiSettingsToggles } from "@/components/admin/global-ai-settings-toggles";
import { Button } from "@/components/ui/button";
import {
 DataTablePagination,
 DataTableToolbar,
 paginate,
} from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SIMULATION_TEMPLATE_PRESETS } from "@/lib/simulations/template-presets";

type TemplateRow = {
 id: string;
 name: string;
 persona: string;
 vertical: string;
 solutionFocus: string;
 difficulty: string;
 promptBody: string;
 practiceRoundsBeforeSubmit: number;
 parameterized: boolean;
 hasSolutionPlaceholder: boolean;
 updatedAt: string;
};

const emptyForm = {
 name: "",
 persona: "Dynamic (AI-generated buyer)",
 vertical: "SLED",
 solutionFocus: "SailPoint Agent Identity Security (AIS)",
 difficulty: "intermediate" as const,
 practiceRoundsBeforeSubmit: 1,
 promptBody: "",
};

const PAGE_SIZE = 15;

export function SimulationTemplateManagement() {
 const [templates, setTemplates] = useState<TemplateRow[]>([]);
 const [search, setSearch] = useState("");
 const [page, setPage] = useState(1);
 const [isLoading, setIsLoading] = useState(true);
 const [isSaving, setIsSaving] = useState(false);
 const [editingId, setEditingId] = useState<string | null>(null);
 const [showEditor, setShowEditor] = useState(false);
 const [form, setForm] = useState(emptyForm);

 const load = useCallback(async () => {
 setIsLoading(true);
 const response = await fetch("/api/admin/simulation-templates");

 if (!response.ok) {
 toast.error("Failed to load templates.");
 setIsLoading(false);
 return;
 }

 const body = (await response.json()) as { templates: TemplateRow[] };
 setTemplates(body.templates);
 setIsLoading(false);
 }, []);

 useEffect(() => {
 void load();
 }, [load]);

 const filtered = useMemo(() => {
 const query = search.trim().toLowerCase();
 if (!query) return templates;

 return templates.filter((template) =>
 [template.name, template.persona, template.vertical, template.solutionFocus]
 .join(" ")
 .toLowerCase()
 .includes(query),
 );
 }, [search, templates]);

 const { rows, page: safePage, pageCount } = paginate(filtered, page, PAGE_SIZE);

 useEffect(() => {
 setPage(1);
 }, [search]);

 function openCreate() {
 setEditingId(null);
 setForm(emptyForm);
 setShowEditor(true);
 }

 function openEdit(template: TemplateRow) {
 setEditingId(template.id);
 setForm({
 name: template.name,
 persona: template.persona,
 vertical: template.vertical,
 solutionFocus: template.solutionFocus,
 difficulty: template.difficulty as typeof emptyForm.difficulty,
 practiceRoundsBeforeSubmit: template.practiceRoundsBeforeSubmit,
 promptBody: template.promptBody,
 });
 setShowEditor(true);
 }

 function loadPreset(key: keyof typeof SIMULATION_TEMPLATE_PRESETS) {
 const preset = SIMULATION_TEMPLATE_PRESETS[key];
 setForm({
 name: preset.name,
 persona: preset.persona,
 vertical: preset.vertical,
 solutionFocus: preset.solutionFocus,
 difficulty: "intermediate",
 practiceRoundsBeforeSubmit: 1,
 promptBody: preset.promptBody,
 });
 setShowEditor(true);
 }

 async function handlePromptFile(event: React.ChangeEvent<HTMLInputElement>) {
 const file = event.target.files?.[0];
 if (!file) return;
 const text = await file.text();
 setForm((current) => ({ ...current, promptBody: text }));
 toast.success("Prompt loaded from file.");
 }

 async function saveTemplate(event: React.FormEvent) {
 event.preventDefault();
 setIsSaving(true);

 const endpoint = editingId ? `/api/admin/simulation-templates/${editingId}` : "/api/admin/simulation-templates";
 const response = await fetch(endpoint, {
 method: editingId ? "PATCH" : "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 name: form.name,
 persona: form.persona,
 vertical: form.vertical,
 solutionFocus: form.solutionFocus,
 difficulty: form.difficulty,
 practiceRoundsBeforeSubmit: form.practiceRoundsBeforeSubmit,
 promptBody: form.promptBody,
 }),
 });

 if (!response.ok) {
 toast.error("Save failed.");
 setIsSaving(false);
 return;
 }

 toast.success(editingId ? "Template updated." : "Template created.");
 setShowEditor(false);
 setEditingId(null);
 setForm(emptyForm);
 await load();
 setIsSaving(false);
 }

 async function removeTemplate(template: TemplateRow) {
 if (!confirm(`Delete "${template.name}"? Managers will no longer see this template.`)) {
 return;
 }

 const response = await fetch(`/api/admin/simulation-templates/${template.id}`, { method: "DELETE" });
 if (!response.ok) {
 toast.error("Delete failed.");
 return;
 }

 toast.success("Template deleted.");
 await load();
 }

 if (isLoading) {
 return (
 <div className="flex justify-center py-12">
 <Loader2 className="h-6 w-6 animate-spin text-sp-blue" />
 </div>
 );
 }

 return (
 <div className="space-y-4">
 <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
 <div>
 <h2 className="text-lg font-bold text-sp-navy">Simulation prompt templates</h2>
 <p className="text-sm text-sp-navy-muted">
 Admins maintain the library here. Managers pick templates when assigning on{" "}
 <strong className="text-sp-navy">Manager → Assign simulations</strong>.
 </p>
 </div>
 <div className="flex flex-wrap gap-2">
 <Button onClick={() => loadPreset("sledRoleplay")} size="sm" type="button" variant="outline">
 SLED roleplay preset
 </Button>
 <Button onClick={() => loadPreset("elevatorPitch")} size="sm" type="button" variant="outline">
 Elevator pitch preset
 </Button>
 <Button onClick={openCreate} size="sm">
 <Plus className="h-4 w-4" />
 New template
 </Button>
 </div>
 </div>

 <DataTableToolbar
 filtered={filtered.length}
 onSearchChange={setSearch}
 placeholder="Search templates by name, persona, vertical…"
 search={search}
 total={templates.length}
 />

 <div className="overflow-hidden border border-[#E2DFD9] bg-white">
 <div
 className="grid border-b border-[#ECEAE6] bg-[#F9F8F6] px-[18px] py-[9px]"
 style={{ gridTemplateColumns: "1fr 130px 110px 80px 80px 160px" }}
 >
 {["Template", "Persona", "Vertical", "Model", "Uses", ""].map((header) => (
 <span className="text-[9.5px] font-bold uppercase tracking-[0.07em] text-[#A09D98]" key={header}>
 {header}
 </span>
 ))}
 </div>
 {rows.length === 0 ? (
 <p className="px-4 py-8 text-center text-[#A09D98]">No templates match your search.</p>
 ) : (
 rows.map((template) => (
 <div
 className="grid items-center border-b border-[#f9fafb] px-[18px] py-[11px] transition hover:bg-[#f7fafd] last:border-b-0"
 key={template.id}
 style={{ gridTemplateColumns: "1fr 130px 110px 80px 80px 160px" }}
 >
 <div className="flex items-center gap-[14px]">
 <div className="flex h-[32px] w-[32px] flex-shrink-0 items-center justify-center bg-[#e8f2fc]">
 <svg fill="none" height="16" stroke="#0071ce" strokeLinecap="round" strokeWidth="1.4" viewBox="0 0 16 16" width="16">
 <path d="M3 8h10M8 3v10" />
 <rect height="12" rx="2" width="12" x="2" y="2" />
 </svg>
 </div>
 <div>
 <p className="text-[12px] font-semibold text-[#3D3C38]">{template.name}</p>
 <p className="text-[10.5px] text-[#A09D98]">
 Persona: {template.persona} · {template.vertical}
 </p>
 </div>
 </div>
 <span className="truncate text-[12px] text-[#3D3C38]">{template.persona}</span>
 <span className="text-[12px] text-[#3D3C38]">{template.vertical}</span>
 <span className="w-fit rounded-full bg-[#e8f2fc] px-[8px] py-[2px] text-[9.5px] font-bold text-[#0057a8]">
 {template.parameterized ? "Dynamic" : "Fixed"}
 </span>
 <span className="text-[10.5px] text-[#A09D98]">— uses</span>
 <div className="flex gap-[6px]">
 <button
 className="inline-flex items-center border border-[#E2DFD9] bg-white px-[10px] py-[5px] text-[11px] font-semibold text-[#3D3C38]"
 onClick={() => openEdit(template)}
 type="button"
 >
 Edit prompt
 </button>
 <button
 className="inline-flex items-center border border-[#E2DFD9] bg-white px-[10px] py-[5px] text-[11px] font-semibold text-[#3D3C38]"
 type="button"
 >
 Preview
 </button>
 </div>
 </div>
 ))
 )}
 </div>

 <DataTablePagination onPageChange={setPage} page={safePage} pageCount={pageCount} />

 <GlobalAiSettingsToggles />

 {showEditor ? (
 <div className="border border-[#E2DFD9] bg-white p-[18px_22px]">
 <p className="text-[12.5px] font-bold text-[#0D0E12]">{editingId ? "Edit template" : "New template"}</p>
 <p className="mb-[14px] mt-[2px] text-[11px] text-[#6B6860]">
 Use {"{{solution}}"}, {"{{vertical}}"}, {"{{difficulty}}"} where managers should override at assign time.
 </p>
 <form className="grid gap-4 md:grid-cols-2" onSubmit={saveTemplate}>
 <Input
 onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
 placeholder="Template name"
 required
 value={form.name}
 />
 <Input
 onChange={(event) => setForm((current) => ({ ...current, persona: event.target.value }))}
 placeholder="Default persona label"
 required
 value={form.persona}
 />
 <Input
 onChange={(event) => setForm((current) => ({ ...current, vertical: event.target.value }))}
 placeholder="Default vertical"
 required
 value={form.vertical}
 />
 <Input
 onChange={(event) => setForm((current) => ({ ...current, solutionFocus: event.target.value }))}
 placeholder="Default solution"
 required
 value={form.solutionFocus}
 />
 <label className="space-y-2 text-sm font-semibold text-sp-navy-muted">
 Recommended practice rounds
 <Input
 max={10}
 min={0}
 onChange={(event) =>
 setForm((current) => ({
 ...current,
 practiceRoundsBeforeSubmit: Number(event.target.value),
 }))
 }
 required
 type="number"
 value={form.practiceRoundsBeforeSubmit}
 />
 <span className="block text-xs font-normal text-sp-navy-muted">
 Suggested number of practice attempts before submitting. SEs can still submit anytime if they are happy
 with their score. Set 0 to hide the recommendation.
 </span>
 </label>
 <Textarea
 className="min-h-[280px] font-mono text-xs md:col-span-2"
 onChange={(event) => setForm((current) => ({ ...current, promptBody: event.target.value }))}
 placeholder="Full AI prompt body"
 required
 value={form.promptBody}
 />
 <label className="flex cursor-pointer items-center gap-2 text-sm text-sp-navy-muted md:col-span-2">
 <Upload className="h-4 w-4" />
 Upload .txt / .md prompt file
 <input accept=".txt,.md" className="hidden" onChange={(event) => void handlePromptFile(event)} type="file" />
 </label>
 <div className="flex gap-2 md:col-span-2">
 <Button disabled={isSaving} type="submit">
 {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
 {editingId ? "Save changes" : "Create template"}
 </Button>
 <Button
 onClick={() => {
 setShowEditor(false);
 setEditingId(null);
 setForm(emptyForm);
 }}
 type="button"
 variant="outline"
 >
 Cancel
 </Button>
 </div>
 </form>
 </div>
 ) : null}
 </div>
 );
}
