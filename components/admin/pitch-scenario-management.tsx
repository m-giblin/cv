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
import { Drawer } from "@/components/ui/drawer";
import { Tag } from "@/components/ui/tag";
import { cn } from "@/lib/utils";

type ScenarioRow = {
  id: string;
  slug: string;
  track: string;
  shortLabel: string;
  label: string;
  promptLabel: string;
  prompt: string;
  description: string;
  competencies: string[];
  linkedSolution: string | null;
  maxDurationSec: number;
  sortOrder: number;
  active: boolean;
  passingGrade: number;
};

type Track = "elevator" | "discovery" | "competitive" | "executive" | "governance";

const emptyForm = {
  slug: "",
  track: "elevator" as Track,
  shortLabel: "",
  label: "",
  promptLabel: "",
  prompt: "",
  description: "",
  competencies: "",
  linkedSolution: "",
  maxDurationSec: 60,
  sortOrder: 0,
  passingGrade: 4,
};

const PAGE_SIZE = 12;

function paginate<T>(items: T[], page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;
  return { page: safePage, pageCount, rows: items.slice(start, start + pageSize) };
}

export function PitchScenarioManagement() {
  const formId = useId();
  const [scenarios, setScenarios] = useState<ScenarioRow[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setIsLoading(true);
    const response = await fetch("/api/admin/pitch-scenarios");
    if (!response.ok) {
      toast.error("Failed to load pitch scenarios.");
      setIsLoading(false);
      return;
    }
    const body = (await response.json()) as { scenarios: ScenarioRow[] };
    setScenarios(body.scenarios);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return scenarios;
    return scenarios.filter((row) =>
      [row.slug, row.label, row.track, row.linkedSolution ?? ""].join(" ").toLowerCase().includes(query),
    );
  }, [scenarios, search]);

  const { rows, page: safePage, pageCount } = paginate(filtered, page, PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowEditor(true);
  }

  function openEdit(row: ScenarioRow) {
    setEditingId(row.id);
    setForm({
      slug: row.slug,
      track: row.track as Track,
      shortLabel: row.shortLabel,
      label: row.label,
      promptLabel: row.promptLabel,
      prompt: row.prompt,
      description: row.description,
      competencies: row.competencies.join(", "),
      linkedSolution: row.linkedSolution ?? "",
      maxDurationSec: row.maxDurationSec,
      sortOrder: row.sortOrder,
      passingGrade: row.passingGrade,
    });
    setShowEditor(true);
  }

  function closeEditor() {
    setShowEditor(false);
  }

  async function saveScenario(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);

    const payload = {
      slug: form.slug,
      track: form.track,
      shortLabel: form.shortLabel,
      label: form.label,
      promptLabel: form.promptLabel,
      prompt: form.prompt,
      description: form.description,
      competencies: form.competencies
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      linkedSolution: form.linkedSolution.trim() || null,
      maxDurationSec: form.maxDurationSec,
      sortOrder: form.sortOrder,
      passingGrade: form.passingGrade,
    };

    const endpoint = editingId ? `/api/admin/pitch-scenarios/${editingId}` : "/api/admin/pitch-scenarios";
    const response = await fetch(endpoint, {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      toast.error("Save failed.");
      setIsSaving(false);
      return;
    }

    toast.success(editingId ? "Scenario updated." : "Scenario created.");
    setShowEditor(false);
    setEditingId(null);
    setForm(emptyForm);
    await load();
    setIsSaving(false);
  }

  async function deactivate(row: ScenarioRow) {
    if (!confirm(`Deactivate "${row.label}"? It will leave the assignment queue pool.`)) return;
    const response = await fetch(`/api/admin/pitch-scenarios/${row.id}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("Deactivate failed.");
      return;
    }
    toast.success("Scenario deactivated.");
    await load();
  }

  return (
    <section aria-labelledby={`${formId}-heading`} className="flex flex-col gap-4">
      <SectionHeading
        actions={<SecondaryButton onClick={openCreate}>+ Add scenario</SecondaryButton>}
        meta={isLoading ? undefined : `${scenarios.length} scenarios`}
        title={<span id={`${formId}-heading`}>Pitch scenario library</span>}
      />
      <p className="text-sm text-muted">
        Elevator pitches per solution and situational drills. SEs receive four active slots from this pool.
      </p>

      {isLoading ? (
        <LoadingState label="Loading scenarios…" />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <TextInput
              aria-label="Search scenarios"
              className="max-w-sm"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search scenarios…"
              type="search"
              value={search}
            />
            <span className="label-mono">
              {filtered.length} of {scenarios.length}
            </span>
          </div>

          <AdminTable caption="Pitch scenarios">
            <thead>
              <tr>
                <Th>Scenario</Th>
                <Th>Track</Th>
                <Th>Solution</Th>
                <Th>Pass</Th>
                <Th>Status</Th>
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
                      {scenarios.length === 0 ? "No scenarios yet." : "No scenarios match your search."}
                    </EmptyState>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr className={cn(showEditor && editingId === row.id && "bg-blue-soft")} key={row.id}>
                    <Td>
                      <p className="font-bold text-ink">{row.label}</p>
                      <Mono className="normal-case">{row.slug}</Mono>
                    </Td>
                    <Td>
                      <Mono>{row.track}</Mono>
                    </Td>
                    <Td className="text-ink-2">{row.linkedSolution ?? "—"}</Td>
                    <Td>
                      <Mono>{row.passingGrade}+</Mono>
                    </Td>
                    <Td>
                      {row.active ? <Tag tone="success">● Active</Tag> : <Tag tone="neutral">• Inactive</Tag>}
                    </Td>
                    <Td className="text-right whitespace-nowrap">
                      <div className="inline-flex gap-4">
                        <LinkButton onClick={() => openEdit(row)}>Edit</LinkButton>
                        {row.active ? (
                          <LinkButton onClick={() => void deactivate(row)} tone="danger">
                            Deactivate
                          </LinkButton>
                        ) : null}
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

      <Drawer
        footer={
          <>
            <button className="btn-primary" disabled={isSaving} form={formId} type="submit">
              {isSaving ? "Saving…" : "Save scenario"}
            </button>
            <SecondaryButton onClick={closeEditor}>Cancel</SecondaryButton>
          </>
        }
        onClose={closeEditor}
        open={showEditor}
        title={editingId ? "Edit scenario" : "Add scenario"}
      >
        <form className="flex flex-col gap-4" id={formId} onSubmit={(event) => void saveScenario(event)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field htmlFor={`${formId}-slug`} label="Slug">
              <TextInput
                id={`${formId}-slug`}
                onChange={(e) => setForm((c) => ({ ...c, slug: e.target.value }))}
                placeholder="elevator-isc"
                required
                value={form.slug}
              />
            </Field>
            <Field htmlFor={`${formId}-track`} label="Track">
              <SelectInput
                id={`${formId}-track`}
                onChange={(e) => setForm((c) => ({ ...c, track: e.target.value as Track }))}
                value={form.track}
              >
                <option value="elevator">Elevator</option>
                <option value="discovery">Discovery</option>
                <option value="competitive">Competitive</option>
                <option value="executive">Executive</option>
                <option value="governance">Governance</option>
              </SelectInput>
            </Field>
          </div>
          <Field htmlFor={`${formId}-short`} label="Short label">
            <TextInput
              id={`${formId}-short`}
              onChange={(e) => setForm((c) => ({ ...c, shortLabel: e.target.value }))}
              required
              value={form.shortLabel}
            />
          </Field>
          <Field htmlFor={`${formId}-label`} label="Full label">
            <TextInput
              id={`${formId}-label`}
              onChange={(e) => setForm((c) => ({ ...c, label: e.target.value }))}
              required
              value={form.label}
            />
          </Field>
          <Field htmlFor={`${formId}-prompt-label`} label="Prompt label">
            <TextInput
              id={`${formId}-prompt-label`}
              onChange={(e) => setForm((c) => ({ ...c, promptLabel: e.target.value }))}
              required
              value={form.promptLabel}
            />
          </Field>
          <Field htmlFor={`${formId}-solution`} hint="Optional." label="Linked solution">
            <TextInput
              id={`${formId}-solution`}
              onChange={(e) => setForm((c) => ({ ...c, linkedSolution: e.target.value }))}
              value={form.linkedSolution}
            />
          </Field>
          <Field htmlFor={`${formId}-prompt`} label="Pitch prompt">
            <TextArea
              id={`${formId}-prompt`}
              onChange={(e) => setForm((c) => ({ ...c, prompt: e.target.value }))}
              required
              rows={3}
              value={form.prompt}
            />
          </Field>
          <Field htmlFor={`${formId}-description`} label="Coaching description">
            <TextArea
              id={`${formId}-description`}
              onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
              required
              rows={2}
              value={form.description}
            />
          </Field>
          <Field hint="Comma-separated." htmlFor={`${formId}-competencies`} label="Competencies">
            <TextInput
              id={`${formId}-competencies`}
              onChange={(e) => setForm((c) => ({ ...c, competencies: e.target.value }))}
              value={form.competencies}
            />
          </Field>
        </form>
      </Drawer>
    </section>
  );
}
