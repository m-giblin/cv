"use client";

import { Loader2, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTableShell, DataTableToolbar, paginate, DataTablePagination } from "@/components/ui/data-table";
import {
  DIFFICULTY_OPTIONS,
  SOLUTION_OPTIONS,
  VERTICAL_OPTIONS,
} from "@/lib/simulations/prompt-template";
import { Profile } from "@/lib/types";

type Template = {
  id: string;
  name: string;
  persona: string;
  vertical: string;
  solution_focus: string;
  difficulty: "foundational" | "intermediate" | "advanced";
  parameterized: boolean;
  hasSolutionPlaceholder?: boolean;
};

const PAGE_SIZE = 10;

export function SimulationAssignForm({ assignees }: { assignees: Profile[] }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [templateSearch, setTemplateSearch] = useState("");
  const [templatePage, setTemplatePage] = useState(1);
  const [assignedTo, setAssignedTo] = useState(assignees[0]?.id ?? "");
  const [vertical, setVertical] = useState<string>(VERTICAL_OPTIONS[0]);
  const [solutionFocus, setSolutionFocus] = useState<string>(SOLUTION_OPTIONS[1]);
  const [customSolution, setCustomSolution] = useState("");
  const [difficulty, setDifficulty] = useState<"foundational" | "intermediate" | "advanced">("intermediate");
  const [isSaving, setIsSaving] = useState(false);

  const selectedTemplate = templates.find((item) => item.id === templateId);
  const isFullParameterized = selectedTemplate?.parameterized ?? true;
  const showSolution = isFullParameterized || selectedTemplate?.hasSolutionPlaceholder;
  const showVerticalDifficulty = isFullParameterized;
  const resolvedSolution = solutionFocus === "custom" ? customSolution.trim() : solutionFocus;

  useEffect(() => {
    void fetch("/api/simulations/assignments")
      .then((response) => response.json())
      .then((body: { templates: Template[] }) => {
        setTemplates(body.templates);
        const defaultTemplate =
          body.templates.find((template) => template.name === "SLED Sales Roleplay") ??
          body.templates[0];

        if (defaultTemplate) {
          setTemplateId(defaultTemplate.id);
          setVertical(defaultTemplate.vertical);
          setSolutionFocus(defaultTemplate.solution_focus);
          setDifficulty(defaultTemplate.difficulty);
        }
      });
  }, []);

  const filteredTemplates = useMemo(() => {
    const query = templateSearch.trim().toLowerCase();
    if (!query) return templates;
    return templates.filter((template) =>
      [template.name, template.persona, template.vertical].join(" ").toLowerCase().includes(query),
    );
  }, [templateSearch, templates]);

  const { rows: templateRows, page: templateSafePage, pageCount: templatePageCount } = paginate(
    filteredTemplates,
    templatePage,
    PAGE_SIZE,
  );

  useEffect(() => {
    setTemplatePage(1);
  }, [templateSearch]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!templateId) {
      toast.error("Select a prompt template.");
      return;
    }

    if (!resolvedSolution && showSolution) {
      toast.error("Enter a SailPoint solution.");
      return;
    }

    setIsSaving(true);

    const response = await fetch("/api/simulations/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId,
        assignedTo,
        vertical: showVerticalDifficulty ? vertical : selectedTemplate?.vertical ?? vertical,
        solutionFocus: showSolution ? resolvedSolution : selectedTemplate?.solution_focus ?? resolvedSolution,
        difficulty: showVerticalDifficulty ? difficulty : selectedTemplate?.difficulty ?? difficulty,
        persona: selectedTemplate?.persona,
      }),
    });

    if (!response.ok) {
      toast.error("Assignment failed.");
      setIsSaving(false);
      return;
    }

    toast.success("Simulation assigned — SE opens Simulations to start.");
    setIsSaving(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assign simulation</CardTitle>
        <CardDescription>
          Step 1: select a prompt template from the library. Step 2: pick the SE and override Solution / Vertical /
          Difficulty if the template allows it.
        </CardDescription>
      </CardHeader>

      <div className="space-y-6 px-5 pb-5">
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-sp-navy">1. Prompt template</h3>
          <DataTableToolbar
            filtered={filteredTemplates.length}
            onSearchChange={setTemplateSearch}
            placeholder="Search templates…"
            search={templateSearch}
            total={templates.length}
          />
          <DataTableShell>
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-sp-blue/10 bg-sp-blue-soft/30 text-xs uppercase tracking-wide text-sp-navy-muted">
                <tr>
                  <th className="w-10 px-4 py-3" />
                  <th className="px-4 py-3 font-semibold">Template</th>
                  <th className="px-4 py-3 font-semibold">Persona</th>
                  <th className="px-4 py-3 font-semibold">Vertical</th>
                  <th className="px-4 py-3 font-semibold">Overrides</th>
                </tr>
              </thead>
              <tbody>
                {templateRows.map((template) => {
                  const selected = template.id === templateId;
                  return (
                    <tr
                      className={`cursor-pointer border-b border-sp-blue/5 ${selected ? "bg-sp-blue-soft/50" : "hover:bg-sp-blue-soft/20"}`}
                      key={template.id}
                      onClick={() => {
                        setTemplateId(template.id);
                        setVertical(template.vertical);
                        setSolutionFocus(template.solution_focus);
                        setDifficulty(template.difficulty);
                      }}
                    >
                      <td className="px-4 py-3">
                        <input checked={selected} name="template" onChange={() => setTemplateId(template.id)} type="radio" />
                      </td>
                      <td className="px-4 py-3 font-semibold text-sp-navy">{template.name}</td>
                      <td className="max-w-[180px] truncate px-4 py-3 text-sp-navy-muted" title={template.persona}>
                        {template.persona}
                      </td>
                      <td className="px-4 py-3 text-sp-navy-muted">{template.vertical}</td>
                      <td className="px-4 py-3">
                        {template.parameterized ? (
                          <Badge tone="blue">Solution + vertical + difficulty</Badge>
                        ) : template.hasSolutionPlaceholder ? (
                          <Badge tone="purple">Solution</Badge>
                        ) : (
                          <Badge tone="slate">Fixed</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </DataTableShell>
          <DataTablePagination onPageChange={setTemplatePage} page={templateSafePage} pageCount={templatePageCount} />
        </section>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <h3 className="text-sm font-bold text-sp-navy">2. Assignment details</h3>

          <label className="block space-y-1 text-sm font-medium text-sp-navy-muted">
            Assign to
            <select
              className="h-10 w-full rounded-xl border border-sp-blue/15 bg-white px-3 text-sm"
              onChange={(e) => setAssignedTo(e.target.value)}
              required
              value={assignedTo}
            >
              {assignees.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.fullName}
                </option>
              ))}
            </select>
          </label>

          {showSolution ? (
            <>
              <label className="block space-y-1 text-sm font-medium text-sp-navy-muted">
                Solution
                <select
                  className="h-10 w-full rounded-xl border border-sp-blue/15 bg-white px-3 text-sm"
                  onChange={(e) => setSolutionFocus(e.target.value)}
                  value={solutionFocus}
                >
                  {SOLUTION_OPTIONS.map((solution) => (
                    <option key={solution} value={solution}>
                      {solution}
                    </option>
                  ))}
                  <option value="custom">Custom solution…</option>
                </select>
              </label>
              {solutionFocus === "custom" ? (
                <input
                  className="h-10 w-full rounded-xl border border-sp-blue/15 px-3 text-sm"
                  onChange={(e) => setCustomSolution(e.target.value)}
                  placeholder="Enter a SailPoint solution"
                  required
                  value={customSolution}
                />
              ) : null}
            </>
          ) : null}

          {showVerticalDifficulty ? (
            <>
              <label className="block space-y-1 text-sm font-medium text-sp-navy-muted">
                Vertical
                <select
                  className="h-10 w-full rounded-xl border border-sp-blue/15 bg-white px-3 text-sm"
                  onChange={(e) => setVertical(e.target.value)}
                  value={vertical}
                >
                  {VERTICAL_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1 text-sm font-medium text-sp-navy-muted">
                Difficulty
                <select
                  className="h-10 w-full rounded-xl border border-sp-blue/15 bg-white px-3 text-sm"
                  onChange={(e) =>
                    setDifficulty(e.target.value as "foundational" | "intermediate" | "advanced")
                  }
                  value={difficulty}
                >
                  {DIFFICULTY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}

          <Button className="w-full" disabled={isSaving || !templateId} type="submit">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Assign to SE
          </Button>
        </form>
      </div>
    </Card>
  );
}
