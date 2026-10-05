"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AdminTable,
  EmptyState,
  Field,
  LinkButton,
  LoadingState,
  Mono,
  SecondaryButton,
  SectionHeading,
  SelectInput,
  Td,
  TextArea,
  TextInput,
  Th,
} from "@/components/admin/admin-ui";
import { GlobalAiSettingsToggles } from "@/components/admin/global-ai-settings-toggles";
import { Drawer } from "@/components/ui/drawer";
import { Tag } from "@/components/ui/tag";
import { SIMULATION_TEMPLATE_PRESETS } from "@/lib/simulations/template-presets";
import { cn } from "@/lib/utils";

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

type Difficulty = "foundational" | "intermediate" | "advanced";

const emptyForm = {
  name: "",
  persona: "Dynamic (AI-generated buyer)",
  vertical: "SLED",
  solutionFocus: "Agent Identity Security (AIS)",
  difficulty: "intermediate" as Difficulty,
  practiceRoundsBeforeSubmit: 1,
  promptBody: "",
};

const PAGE_SIZE = 15;

function paginate<T>(items: T[], page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;
  return { page: safePage, pageCount, rows: items.slice(start, start + pageSize) };
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function SimulationTemplateManagement() {
  const formId = useId();
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
      difficulty: template.difficulty as Difficulty,
      practiceRoundsBeforeSubmit: template.practiceRoundsBeforeSubmit,
      promptBody: template.promptBody,
    });
    setShowEditor(true);
  }

  function closeEditor() {
    setShowEditor(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function loadPreset(key: keyof typeof SIMULATION_TEMPLATE_PRESETS) {
    const preset = SIMULATION_TEMPLATE_PRESETS[key];
    setEditingId(null);
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
    closeEditor();
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

  return (
    <section className="flex flex-col gap-4" aria-labelledby={`${formId}-heading`}>
      <SectionHeading
        actions={
          <>
            <SecondaryButton onClick={() => loadPreset("sledRoleplay")}>SLED roleplay preset</SecondaryButton>
            <SecondaryButton onClick={() => loadPreset("elevatorPitch")}>Elevator pitch preset</SecondaryButton>
            <SecondaryButton onClick={openCreate}>+ New simulation template</SecondaryButton>
          </>
        }
        meta={isLoading ? undefined : `${templates.length} templates`}
        title={<span id={`${formId}-heading`}>Simulation prompt templates</span>}
      />
      <p className="text-sm text-muted">
        Admins maintain the library here. Managers pick templates when assigning on{" "}
        <strong className="font-bold text-ink">Manager › Assign simulations</strong>.
      </p>

      {isLoading ? (
        <LoadingState label="Loading templates…" />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <TextInput
              aria-label="Search templates"
              className="max-w-sm"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, persona, vertical…"
              type="search"
              value={search}
            />
            <span className="label-mono">
              {filtered.length} of {templates.length}
            </span>
          </div>

          <AdminTable caption="Simulation prompt templates">
            <thead>
              <tr>
                <Th>Template</Th>
                <Th>Vertical</Th>
                <Th>Difficulty</Th>
                <Th>Mode</Th>
                <Th>Updated</Th>
                <Th>
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState>
                      {templates.length === 0 ? "No templates yet." : "No templates match your search."}
                    </EmptyState>
                  </td>
                </tr>
              ) : (
                rows.map((template) => (
                  <tr
                    className={cn(showEditor && editingId === template.id && "bg-blue-soft")}
                    key={template.id}
                  >
                    <Td>
                      <p className="font-bold text-ink">{template.name}</p>
                      <p className="mt-0.5 text-[13px] text-muted">Persona: {template.persona}</p>
                    </Td>
                    <Td className="text-ink-2">{template.vertical}</Td>
                    <Td>
                      <Mono>{template.difficulty}</Mono>
                    </Td>
                    <Td>
                      <Tag tone={template.parameterized ? "blue" : "neutral"}>
                        {template.parameterized ? "◆ Dynamic" : "• Fixed"}
                      </Tag>
                    </Td>
                    <Td>
                      <Mono>{formatDate(template.updatedAt)}</Mono>
                    </Td>
                    <Td className="text-right whitespace-nowrap">
                      <div className="inline-flex gap-4">
                        <LinkButton onClick={() => openEdit(template)}>Edit</LinkButton>
                        <LinkButton onClick={() => void removeTemplate(template)} tone="danger">
                          Delete
                        </LinkButton>
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </AdminTable>

          {pageCount > 1 ? (
            <div className="flex items-center justify-end gap-3">
              <span className="label-mono">
                Page {safePage} of {pageCount}
              </span>
              <SecondaryButton disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                Previous
              </SecondaryButton>
              <SecondaryButton disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)}>
                Next
              </SecondaryButton>
            </div>
          ) : null}
        </>
      )}

      <GlobalAiSettingsToggles />

      <Drawer
        footer={
          <>
            <button className="btn-primary" disabled={isSaving} form={formId} type="submit">
              {isSaving ? "Saving…" : editingId ? "Save changes" : "Create template"}
            </button>
            <SecondaryButton onClick={closeEditor}>Cancel</SecondaryButton>
          </>
        }
        onClose={closeEditor}
        open={showEditor}
        title={editingId ? "Edit template" : "New simulation template"}
      >
        <form className="flex flex-col gap-4" id={formId} onSubmit={(event) => void saveTemplate(event)}>
          <p className="text-sm text-muted">
            Use <code className="font-mono text-[13px] text-ink">{"{{solution}}"}</code>,{" "}
            <code className="font-mono text-[13px] text-ink">{"{{vertical}}"}</code>,{" "}
            <code className="font-mono text-[13px] text-ink">{"{{difficulty}}"}</code> where managers should
            override at assign time.
          </p>
          <Field htmlFor={`${formId}-name`} label="Template name">
            <TextInput
              id={`${formId}-name`}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              required
              value={form.name}
            />
          </Field>
          <Field htmlFor={`${formId}-persona`} label="Default persona">
            <TextInput
              id={`${formId}-persona`}
              onChange={(event) => setForm((current) => ({ ...current, persona: event.target.value }))}
              required
              value={form.persona}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field htmlFor={`${formId}-vertical`} label="Default vertical">
              <TextInput
                id={`${formId}-vertical`}
                onChange={(event) => setForm((current) => ({ ...current, vertical: event.target.value }))}
                required
                value={form.vertical}
              />
            </Field>
            <Field htmlFor={`${formId}-difficulty`} label="Difficulty">
              <SelectInput
                id={`${formId}-difficulty`}
                onChange={(event) =>
                  setForm((current) => ({ ...current, difficulty: event.target.value as Difficulty }))
                }
                value={form.difficulty}
              >
                <option value="foundational">Foundational</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </SelectInput>
            </Field>
          </div>
          <Field htmlFor={`${formId}-solution`} label="Default solution">
            <TextInput
              id={`${formId}-solution`}
              onChange={(event) => setForm((current) => ({ ...current, solutionFocus: event.target.value }))}
              required
              value={form.solutionFocus}
            />
          </Field>
          <Field
            hint="Suggested practice attempts before submitting. SEs can still submit anytime. Set 0 to hide the recommendation."
            htmlFor={`${formId}-rounds`}
            label="Recommended practice rounds"
          >
            <TextInput
              id={`${formId}-rounds`}
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
          </Field>
          <Field htmlFor={`${formId}-prompt`} label="Prompt body">
            <TextArea
              className="min-h-[280px] font-mono text-[13px]"
              id={`${formId}-prompt`}
              onChange={(event) => setForm((current) => ({ ...current, promptBody: event.target.value }))}
              required
              value={form.promptBody}
            />
          </Field>
          <Field hint="Replaces the prompt body with the file contents." htmlFor={`${formId}-file`} label="Load prompt from file">
            <input
              accept=".txt,.md"
              className="text-sm text-ink-2 file:mr-3 file:rounded-full file:border-[1.5px] file:border-line-strong file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-ink"
              id={`${formId}-file`}
              onChange={(event) => void handlePromptFile(event)}
              type="file"
            />
          </Field>
        </form>
      </Drawer>
    </section>
  );
}
