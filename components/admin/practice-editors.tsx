"use client";

import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { Field, SecondaryButton, SelectInput, TextArea, TextInput } from "@/components/admin/admin-ui";
import { Checkbox } from "@/components/ui/checkbox";
import { Drawer } from "@/components/ui/drawer";
import type { PitchScenarioRow, SimTemplateRow } from "@/lib/admin/practice-library";

type Difficulty = "foundational" | "intermediate" | "advanced";
type Track = "elevator" | "discovery" | "competitive" | "executive" | "governance";

async function errorText(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
  return typeof body?.error === "string" ? body.error : "Could not save. Check the fields and try again.";
}

/** Edit drawer for a simulation template (PATCH /api/admin/simulation-templates/[id]). Power-user view of the full prompt. */
export function SimTemplateEditor({
  row,
  onClose,
  onSaved,
}: {
  row: SimTemplateRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const formId = useId();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    persona: "",
    vertical: "",
    solutionFocus: "",
    difficulty: "intermediate" as Difficulty,
    practiceRoundsBeforeSubmit: 1,
    promptBody: "",
  });

  useEffect(() => {
    if (!row) return;
    setForm({
      name: row.name,
      persona: row.persona,
      vertical: row.vertical,
      solutionFocus: row.solutionFocus,
      difficulty: (["foundational", "intermediate", "advanced"].includes(row.difficulty) ? row.difficulty : "intermediate") as Difficulty,
      practiceRoundsBeforeSubmit: row.practiceRoundsBeforeSubmit,
      promptBody: row.promptBody,
    });
  }, [row]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!row) return;
    setSaving(true);
    const response = await fetch(`/api/admin/simulation-templates/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!response.ok) {
      toast.error(await errorText(response));
      return;
    }
    toast.success(`${form.name} saved.`);
    onSaved();
  }

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <Drawer
      size="form"
      footer={
        <>
          <button className="btn-primary" disabled={saving} form={formId} type="submit">
            {saving ? "Saving…" : "Save changes"}
          </button>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        </>
      }
      onClose={onClose}
      open={row !== null}
      title="Edit simulation"
    >
      <form className="flex flex-col gap-4" id={formId} onSubmit={(event) => void save(event)}>
        <p className="text-sm text-ink-2">
          Write {"{{solution}}"}, {"{{vertical}}"} or {"{{difficulty}}"} in the prompt where managers may change the value when
          they assign it.
        </p>
        <Field htmlFor={`${formId}-name`} label="Name">
          <TextInput id={`${formId}-name`} minLength={3} onChange={(event) => set("name", event.target.value)} required value={form.name} />
        </Field>
        <Field htmlFor={`${formId}-persona`} label="Buyer">
          <TextInput id={`${formId}-persona`} minLength={3} onChange={(event) => set("persona", event.target.value)} required value={form.persona} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor={`${formId}-vertical`} label="Default vertical">
            <TextInput id={`${formId}-vertical`} onChange={(event) => set("vertical", event.target.value)} required value={form.vertical} />
          </Field>
          <Field htmlFor={`${formId}-difficulty`} label="Difficulty">
            <SelectInput id={`${formId}-difficulty`} onChange={(event) => set("difficulty", event.target.value as Difficulty)} value={form.difficulty}>
              <option value="foundational">Foundational</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </SelectInput>
          </Field>
        </div>
        <Field htmlFor={`${formId}-solution`} label="Default solution">
          <TextInput id={`${formId}-solution`} onChange={(event) => set("solutionFocus", event.target.value)} required value={form.solutionFocus} />
        </Field>
        <Field
          hint="Suggested unscored attempts before submitting. SEs can still submit at any time."
          htmlFor={`${formId}-rounds`}
          label="Recommended practice rounds"
        >
          <TextInput
            id={`${formId}-rounds`}
            max={10}
            min={0}
            onChange={(event) => set("practiceRoundsBeforeSubmit", Number(event.target.value))}
            required
            type="number"
            value={form.practiceRoundsBeforeSubmit}
          />
        </Field>
        <Field htmlFor={`${formId}-prompt`} label="Prompt">
          <TextArea
            className="min-h-[280px] text-[13px] leading-[1.6]"
            id={`${formId}-prompt`}
            onChange={(event) => set("promptBody", event.target.value)}
            required
            value={form.promptBody}
          />
        </Field>
      </form>
    </Drawer>
  );
}

/** Edit drawer for a pitch scenario (PATCH /api/admin/pitch-scenarios/[id]). */
export function PitchScenarioEditor({
  row,
  onClose,
  onSaved,
}: {
  row: PitchScenarioRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const formId = useId();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    label: "",
    track: "elevator" as Track,
    prompt: "",
    description: "",
    competencies: "",
    maxDurationSec: 60,
    passingGrade: 4,
    active: true,
  });

  useEffect(() => {
    if (!row) return;
    setForm({
      label: row.label,
      track: row.track as Track,
      prompt: row.prompt,
      description: row.description,
      competencies: row.competencies.join(", "),
      maxDurationSec: row.maxDurationSec,
      passingGrade: row.passingGrade,
      active: row.active,
    });
  }, [row]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!row) return;
    setSaving(true);
    const response = await fetch(`/api/admin/pitch-scenarios/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: row.slug,
        track: form.track,
        shortLabel: row.shortLabel,
        label: form.label,
        promptLabel: row.promptLabel,
        prompt: form.prompt,
        description: form.description,
        competencies: form.competencies
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        linkedSolution: row.linkedSolution,
        maxDurationSec: form.maxDurationSec,
        sortOrder: row.sortOrder,
        active: form.active,
        passingGrade: form.passingGrade,
      }),
    });
    setSaving(false);
    if (!response.ok) {
      toast.error(await errorText(response));
      return;
    }
    toast.success(`${form.label} saved.`);
    onSaved();
  }

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <Drawer
      size="form"
      footer={
        <>
          <button className="btn-primary" disabled={saving} form={formId} type="submit">
            {saving ? "Saving…" : "Save changes"}
          </button>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        </>
      }
      onClose={onClose}
      open={row !== null}
      title="Edit pitch scenario"
    >
      <form className="flex flex-col gap-4" id={formId} onSubmit={(event) => void save(event)}>
        <Field htmlFor={`${formId}-label`} label="Name">
          <TextInput id={`${formId}-label`} minLength={3} onChange={(event) => set("label", event.target.value)} required value={form.label} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field htmlFor={`${formId}-track`} label="Track">
            <SelectInput id={`${formId}-track`} onChange={(event) => set("track", event.target.value as Track)} value={form.track}>
              <option value="elevator">Elevator</option>
              <option value="discovery">Discovery</option>
              <option value="competitive">Competitive</option>
              <option value="executive">Executive</option>
              <option value="governance">Governance</option>
            </SelectInput>
          </Field>
          <Field htmlFor={`${formId}-duration`} label="Time limit">
            <SelectInput id={`${formId}-duration`} onChange={(event) => set("maxDurationSec", Number(event.target.value))} value={form.maxDurationSec}>
              {[...new Set([60, 90, 120, form.maxDurationSec])].map((seconds) => (
                <option key={seconds} value={seconds}>
                  {seconds} seconds
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field htmlFor={`${formId}-pass`} label="Pass mark">
            <SelectInput id={`${formId}-pass`} onChange={(event) => set("passingGrade", Number(event.target.value))} value={form.passingGrade}>
              {[1, 2, 3, 4, 5].map((grade) => (
                <option key={grade} value={grade}>
                  {grade} of 5
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <Field htmlFor={`${formId}-prompt`} label="What the SE sees">
          <TextArea id={`${formId}-prompt`} minLength={10} onChange={(event) => set("prompt", event.target.value)} required rows={3} value={form.prompt} />
        </Field>
        <Field hint="What a strong pitch does. Managers see this when they grade." htmlFor={`${formId}-description`} label="Coaching description">
          <TextArea id={`${formId}-description`} minLength={3} onChange={(event) => set("description", event.target.value)} required rows={3} value={form.description} />
        </Field>
        <Field hint="Separate several with commas." htmlFor={`${formId}-competencies`} label="Counts toward">
          <TextInput id={`${formId}-competencies`} onChange={(event) => set("competencies", event.target.value)} value={form.competencies} />
        </Field>
        <label className="flex items-center gap-2.5 text-sm font-bold text-ink">
          <Checkbox checked={form.active} onChange={(event) => set("active", event.target.checked)} />
          Live: rotates into SE pitch queues
        </label>
      </form>
    </Drawer>
  );
}
