"use client";

import { Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DataTablePagination,
  DataTableShell,
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

      <DataTableShell>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-sp-blue/10 bg-sp-blue-soft/30 text-xs uppercase tracking-wide text-sp-navy-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Persona</th>
              <th className="px-4 py-3 font-semibold">Vertical</th>
              <th className="px-4 py-3 font-semibold">Manager overrides</th>
              <th className="px-4 py-3 font-semibold">Practice</th>
              <th className="px-4 py-3 font-semibold">Updated</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-sp-navy-muted" colSpan={7}>
                  No templates match your search.
                </td>
              </tr>
            ) : (
              rows.map((template) => (
                <tr className="border-b border-sp-blue/5 hover:bg-sp-blue-soft/20" key={template.id}>
                  <td className="px-4 py-3 font-semibold text-sp-navy">{template.name}</td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-sp-navy-muted" title={template.persona}>
                    {template.persona}
                  </td>
                  <td className="px-4 py-3 text-sp-navy-muted">{template.vertical}</td>
                  <td className="px-4 py-3">
                    {template.parameterized ? (
                      <Badge tone="blue">Solution + vertical + difficulty</Badge>
                    ) : template.hasSolutionPlaceholder ? (
                      <Badge tone="purple">Solution only</Badge>
                    ) : (
                      <Badge tone="slate">Fixed prompt</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sp-navy-muted">
                    {template.practiceRoundsBeforeSubmit === 0
                      ? "Optional"
                      : `${template.practiceRoundsBeforeSubmit} required`}
                  </td>
                  <td className="px-4 py-3 text-xs text-sp-navy-muted">
                    {new Date(template.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button aria-label="Edit" onClick={() => openEdit(template)} size="sm" variant="ghost">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button aria-label="Delete" onClick={() => void removeTemplate(template)} size="sm" variant="ghost">
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </DataTableShell>

      <DataTablePagination onPageChange={setPage} page={safePage} pageCount={pageCount} />

      {showEditor ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit template" : "New template"}</CardTitle>
            <CardDescription>
              Use {"{{solution}}"}, {"{{vertical}}"}, {"{{difficulty}}"} where managers should override at assign time.
            </CardDescription>
          </CardHeader>
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
              Practice rounds before submit
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
                SEs and managers must complete this many practice rounds (with coaching feedback) before submitting for
                review. Set 0 to allow immediate submit.
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
        </Card>
      ) : null}
    </div>
  );
}
