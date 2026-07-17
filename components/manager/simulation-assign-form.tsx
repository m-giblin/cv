"use client";

import { Loader2, Send, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const SE_ROLES = new Set(["basic_se", "senior_se", "advisory_solutions_consultant"]);

function seProfiles(profiles: Profile[]) {
  return profiles.filter((profile) => SE_ROLES.has(profile.role));
}

export function SimulationAssignForm({
  assignees,
  teamAssignees,
  personaQuickPick,
  defaultAssigneeId,
}: {
  /** People available in the single-assign dropdown (usually one SE on the detail panel). */
  assignees: Profile[];
  /** Full team used for “Assign to all SEs”. Defaults to assignees when omitted. */
  teamAssignees?: Profile[];
  personaQuickPick?: string | null;
  defaultAssigneeId?: string;
}) {
  const singleOptions = useMemo(() => seProfiles(assignees), [assignees]);
  const teamOptions = useMemo(
    () => seProfiles(teamAssignees ?? assignees),
    [teamAssignees, assignees],
  );

  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [templateSearch, setTemplateSearch] = useState("");
  const [templatePage, setTemplatePage] = useState(1);
  const [assignMode, setAssignMode] = useState<"one" | "all">("one");
  const [assignedTo, setAssignedTo] = useState(
    defaultAssigneeId ?? singleOptions[0]?.id ?? teamOptions[0]?.id ?? "",
  );
  const [vertical, setVertical] = useState<string>(VERTICAL_OPTIONS[0]);
  const [solutionFocus, setSolutionFocus] = useState<string>(SOLUTION_OPTIONS[1]);
  const [customSolution, setCustomSolution] = useState("");
  const [difficulty, setDifficulty] = useState<"foundational" | "intermediate" | "advanced">(
    "intermediate",
  );
  const [isSaving, setIsSaving] = useState(false);

  const selectedTemplate = templates.find((item) => item.id === templateId);
  const isFullParameterized = selectedTemplate?.parameterized ?? true;
  const showSolution = isFullParameterized || selectedTemplate?.hasSolutionPlaceholder;
  const showVerticalDifficulty = isFullParameterized;
  const resolvedSolution = solutionFocus === "custom" ? customSolution.trim() : solutionFocus;
  const canAssignAll = teamOptions.length > 1;

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

  useEffect(() => {
    if (!personaQuickPick || templates.length === 0) return;

    const query = personaQuickPick.toLowerCase();
    const match =
      templates.find(
        (template) =>
          template.persona.toLowerCase().includes(query) || template.name.toLowerCase().includes(query),
      ) ?? templates.find((template) => query.includes(template.persona.toLowerCase()));

    if (!match) return;

    setTemplateId(match.id);
    setVertical(match.vertical);
    setSolutionFocus(match.solution_focus);
    setDifficulty(match.difficulty);
    setTemplateSearch(match.name);
  }, [personaQuickPick, templates]);

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

    const assignedToIds =
      assignMode === "all" ? teamOptions.map((profile) => profile.id) : assignedTo ? [assignedTo] : [];

    if (assignedToIds.length === 0) {
      toast.error("Pick at least one SE.");
      return;
    }

    if (assignMode === "all") {
      const confirmed = window.confirm(
        `Assign this simulation to all ${assignedToIds.length} SEs on your team?`,
      );
      if (!confirmed) return;
    }

    setIsSaving(true);

    const response = await fetch("/api/simulations/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId,
        assignedToIds,
        vertical: showVerticalDifficulty ? vertical : (selectedTemplate?.vertical ?? vertical),
        solutionFocus: showSolution
          ? resolvedSolution
          : (selectedTemplate?.solution_focus ?? resolvedSolution),
        difficulty: showVerticalDifficulty
          ? difficulty
          : (selectedTemplate?.difficulty ?? difficulty),
        persona: selectedTemplate?.persona,
      }),
    });

    setIsSaving(false);

    if (!response.ok) {
      toast.error("Assignment failed.");
      return;
    }

    const body = (await response.json()) as { assignedCount?: number };
    const count = body.assignedCount ?? assignedToIds.length;
    toast.success(
      count === 1
        ? "Simulation assigned — SE opens Simulations to start."
        : `Simulation assigned to ${count} SEs.`,
    );
  }

  return (
    <div className="overflow-hidden border border-[#E2DFD9] bg-white ">
      <div className="border-b border-[#ECEAE6] p-[16px_18px]">
        <p className="text-[15px] font-bold text-[#0D0E12]">Assign simulation</p>
        <p className="text-[12px] text-[#6B6860]">
          Select a template, then assign to one SE or everyone on your team.
        </p>
      </div>

      <div className="space-y-6 p-[16px_18px]">
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
                        <input
                          checked={selected}
                          name="template"
                          onChange={() => setTemplateId(template.id)}
                          type="radio"
                        />
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
          <DataTablePagination
            onPageChange={setTemplatePage}
            page={templateSafePage}
            pageCount={templatePageCount}
          />
        </section>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <h3 className="text-sm font-bold text-sp-navy">2. Assignment details</h3>

          {canAssignAll ? (
            <div className="flex flex-wrap gap-2">
              <button
                className={`border px-3 py-1.5 text-xs font-semibold ${
                  assignMode === "one"
                    ? "border-[#0071ce] bg-[#F0F7FF] text-[#0033a1]"
                    : "border-[#E2DFD9] bg-white text-[#6B6860]"
                }`}
                onClick={() => setAssignMode("one")}
                type="button"
              >
                One SE
              </button>
              <button
                className={`inline-flex items-center gap-1.5 border px-3 py-1.5 text-xs font-semibold ${
                  assignMode === "all"
                    ? "border-[#0071ce] bg-[#F0F7FF] text-[#0033a1]"
                    : "border-[#E2DFD9] bg-white text-[#6B6860]"
                }`}
                onClick={() => setAssignMode("all")}
                type="button"
              >
                <Users className="h-3.5 w-3.5" />
                All SEs ({teamOptions.length})
              </button>
            </div>
          ) : null}

          {assignMode === "one" ? (
            <label className="block space-y-1 text-sm font-medium text-sp-navy-muted">
              Assign to
              <select
                className="h-10 w-full border border-sp-blue/15 bg-white px-3 text-sm"
                onChange={(e) => setAssignedTo(e.target.value)}
                required
                value={assignedTo}
              >
                {(singleOptions.length > 0 ? singleOptions : teamOptions).map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.fullName}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="border border-[#E2DFD9] bg-[#F9F8F6] px-3 py-2 text-sm text-[#3D3C38]">
              Will assign to <span className="font-semibold">{teamOptions.length}</span> SEs:{" "}
              {teamOptions
                .slice(0, 6)
                .map((profile) => profile.fullName)
                .join(", ")}
              {teamOptions.length > 6 ? ` +${teamOptions.length - 6} more` : ""}.
            </p>
          )}

          {showSolution ? (
            <>
              <label className="block space-y-1 text-sm font-medium text-sp-navy-muted">
                Solution
                <select
                  className="h-10 w-full border border-sp-blue/15 bg-white px-3 text-sm"
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
                  className="h-10 w-full border border-sp-blue/15 px-3 text-sm"
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
                  className="h-10 w-full border border-sp-blue/15 bg-white px-3 text-sm"
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
                  className="h-10 w-full border border-sp-blue/15 bg-white px-3 text-sm"
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
            {assignMode === "all" ? `Assign to all ${teamOptions.length} SEs` : "Assign to SE"}
          </Button>
        </form>
      </div>
    </div>
  );
}
