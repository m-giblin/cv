"use client";

import { Loader2, Pencil, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTablePagination, DataTableToolbar, paginate } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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

const emptyForm = {
  slug: "",
  track: "elevator" as const,
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

export function PitchScenarioManagement() {
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
      track: row.track as typeof emptyForm.track,
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
          <h2 className="text-lg font-bold text-sp-navy">Pitch scenario library</h2>
          <p className="text-sm text-sp-navy-muted">
            Elevator pitches per ISC solution and situational drills. SEs receive four active slots from this pool;
            aligned to the SLED eBook v6 chapter library (18 elevator scenarios).
          </p>
        </div>
        <Button onClick={openCreate} size="sm" type="button">
          <Plus className="mr-1 h-4 w-4" />
          Add scenario
        </Button>
      </div>

      {showEditor ? (
        <form className="space-y-3 border border-[#E2DFD9] bg-white p-4" onSubmit={(e) => void saveScenario(e)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input onChange={(e) => setForm((c) => ({ ...c, slug: e.target.value }))} placeholder="slug (elevator-isc)" required value={form.slug} />
            <select
              className="border border-[#E2DFD9] px-3 py-2 text-sm"
              onChange={(e) => setForm((c) => ({ ...c, track: e.target.value as typeof form.track }))}
              value={form.track}
            >
              <option value="elevator">Elevator</option>
              <option value="discovery">Discovery</option>
              <option value="competitive">Competitive</option>
              <option value="executive">Executive</option>
              <option value="governance">Governance</option>
            </select>
            <Input onChange={(e) => setForm((c) => ({ ...c, shortLabel: e.target.value }))} placeholder="Short label" required value={form.shortLabel} />
            <Input onChange={(e) => setForm((c) => ({ ...c, label: e.target.value }))} placeholder="Full label" required value={form.label} />
            <Input onChange={(e) => setForm((c) => ({ ...c, promptLabel: e.target.value }))} placeholder="Prompt label" required value={form.promptLabel} />
            <Input onChange={(e) => setForm((c) => ({ ...c, linkedSolution: e.target.value }))} placeholder="Linked solution (optional)" value={form.linkedSolution} />
          </div>
          <Textarea onChange={(e) => setForm((c) => ({ ...c, prompt: e.target.value }))} placeholder="Pitch prompt" required rows={3} value={form.prompt} />
          <Textarea onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} placeholder="Coaching description" required rows={2} value={form.description} />
          <Input onChange={(e) => setForm((c) => ({ ...c, competencies: e.target.value }))} placeholder="Competencies (comma-separated)" value={form.competencies} />
          <div className="flex flex-wrap gap-2">
            <Button disabled={isSaving} type="submit">{isSaving ? "Saving…" : "Save scenario"}</Button>
            <Button onClick={() => setShowEditor(false)} type="button" variant="outline">Cancel</Button>
          </div>
        </form>
      ) : null}

      <DataTableToolbar
        filtered={filtered.length}
        onSearchChange={setSearch}
        placeholder="Search scenarios…"
        search={search}
        total={scenarios.length}
      />

      <div className="overflow-x-auto border border-[#E2DFD9] bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-[#E2DFD9] bg-[#F9F8F6] text-[11px] uppercase tracking-wide text-[#6B6860]">
            <tr>
              <th className="px-3 py-2">Label</th>
              <th className="px-3 py-2">Track</th>
              <th className="px-3 py-2">Solution</th>
              <th className="px-3 py-2">Pass</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-b border-[#ECEAE6] last:border-0" key={row.id}>
                <td className="px-3 py-2 font-medium text-sp-navy">{row.label}</td>
                <td className="px-3 py-2 capitalize text-sp-navy-muted">{row.track}</td>
                <td className="px-3 py-2 text-sp-navy-muted">{row.linkedSolution ?? "—"}</td>
                <td className="px-3 py-2">{row.passingGrade}+</td>
                <td className="px-3 py-2 text-right">
                  <Button onClick={() => openEdit(row)} size="sm" type="button" variant="ghost">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {row.active ? (
                    <Button onClick={() => void deactivate(row)} size="sm" type="button" variant="ghost">
                      Deactivate
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DataTablePagination onPageChange={setPage} page={safePage} pageCount={pageCount} />
    </div>
  );
}
