"use client";

import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Chip } from "@/components/ui/chip";
import { Tag } from "@/components/ui/tag";
import { paginate } from "@/components/ui/data-table";
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

const INPUT_CLASS =
  "w-full rounded-[10px] border-[1.5px] border-line-strong bg-white px-3 py-2.5 text-sm font-normal text-ink";
const LABEL_CLASS = "block space-y-1.5 text-sm font-bold text-ink";

function seProfiles(profiles: Profile[]) {
  return profiles.filter((profile) => SE_ROLES.has(profile.role));
}

export function SimulationAssignForm({
  assignees,
  teamAssignees,
  personaQuickPick,
  defaultAssigneeId,
  fixedAssigneeIds,
  onAssigned,
}: {
  /** People available in the single-assign dropdown (usually one SE on the detail panel). */
  assignees: Profile[];
  /** Full team used for “Assign to all SEs”. Defaults to assignees when omitted. */
  teamAssignees?: Profile[];
  personaQuickPick?: string | null;
  defaultAssigneeId?: string;
  /**
   * When non-empty, the assignee set is locked to these profile ids: the one/all switch and
   * the SE picker are hidden, and no confirmation is asked before assigning.
   */
  fixedAssigneeIds?: string[];
  /** Called after a successful assignment. */
  onAssigned?: () => void;
}) {
  const singleOptions = useMemo(() => seProfiles(assignees), [assignees]);
  const teamOptions = useMemo(
    () => seProfiles(teamAssignees ?? assignees),
    [teamAssignees, assignees],
  );

  const isFixed = (fixedAssigneeIds?.length ?? 0) > 0;
  const fixedNames = useMemo(() => {
    if (!fixedAssigneeIds || fixedAssigneeIds.length === 0) return [];
    const pool = teamAssignees ?? assignees;
    return fixedAssigneeIds
      .map((id) => pool.find((profile) => profile.id === id)?.fullName)
      .filter((name): name is string => Boolean(name));
  }, [fixedAssigneeIds, teamAssignees, assignees]);

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

  function selectTemplate(template: Template) {
    setTemplateId(template.id);
    setVertical(template.vertical);
    setSolutionFocus(template.solution_focus);
    setDifficulty(template.difficulty);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!templateId) {
      toast.error("Select a prompt template.");
      return;
    }

    if (!resolvedSolution && showSolution) {
      toast.error("Enter a solution.");
      return;
    }

    const assignedToIds = isFixed
      ? [...(fixedAssigneeIds ?? [])]
      : assignMode === "all"
        ? teamOptions.map((profile) => profile.id)
        : assignedTo
          ? [assignedTo]
          : [];

    if (assignedToIds.length === 0) {
      toast.error("Pick at least one SE.");
      return;
    }

    if (!isFixed && assignMode === "all") {
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
    onAssigned?.();
  }

  const fixedCount = fixedAssigneeIds?.length ?? 0;
  const submitLabel = isFixed
    ? fixedCount === 1
      ? "Assign to SE"
      : `Assign to ${fixedCount} SEs`
    : assignMode === "all"
      ? `Assign to all ${teamOptions.length} SEs`
      : "Assign to SE";

  return (
    <div className="min-w-0 space-y-6">
      <section className="space-y-3">
        <div>
          <p className="label-mono">Step 1</p>
          <h3 className="text-[15px] font-bold text-ink">Prompt template</h3>
        </div>

        <label className="block">
          <span className="sr-only">Search templates</span>
          <span className="relative block">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            />
            <input
              className={`${INPUT_CLASS} pl-9`}
              onChange={(event) => setTemplateSearch(event.target.value)}
              placeholder="Search templates…"
              type="search"
              value={templateSearch}
            />
          </span>
        </label>
        <p className="font-mono text-xs text-muted">
          {filteredTemplates.length === templates.length
            ? `${templates.length} templates`
            : `${filteredTemplates.length} of ${templates.length} templates`}
        </p>

        <fieldset className="min-w-0">
          <legend className="sr-only">Prompt template</legend>
          <ul className="overflow-hidden rounded-[14px] border border-line bg-white">
            {templateRows.map((template) => {
              const selected = template.id === templateId;
              return (
                <li className="border-b border-divider last:border-b-0" key={template.id}>
                  <label
                    className={`flex cursor-pointer items-start gap-3 px-4 py-3 ${
                      selected ? "bg-blue-soft" : "hover:bg-bg"
                    }`}
                  >
                    <input
                      checked={selected}
                      className="mt-1 accent-[var(--color-blue)]"
                      name="template"
                      onChange={() => selectTemplate(template)}
                      type="radio"
                    />
                    <span className="min-w-0 flex-1 space-y-1">
                      <span className="block text-sm font-bold text-ink">{template.name}</span>
                      <span className="block truncate text-sm text-muted" title={template.persona}>
                        {template.persona}
                      </span>
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-muted">{template.vertical}</span>
                        {template.parameterized ? (
                          <Tag tone="blue">◆ Solution · vertical · difficulty</Tag>
                        ) : template.hasSolutionPlaceholder ? (
                          <Tag tone="blue">◆ Solution</Tag>
                        ) : (
                          <Tag>• Fixed</Tag>
                        )}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
            {templateRows.length === 0 ? (
              <li className="px-4 py-3 text-sm text-muted">No templates match your search.</li>
            ) : null}
          </ul>
        </fieldset>

        {templatePageCount > 1 ? (
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-xs text-muted">
              Page {templateSafePage} of {templatePageCount}
            </p>
            <div className="flex gap-2">
              <button
                aria-label="Previous page"
                className="btn-secondary inline-flex items-center gap-1 px-3 py-1.5 disabled:opacity-50"
                disabled={templateSafePage <= 1}
                onClick={() => setTemplatePage(templateSafePage - 1)}
                type="button"
              >
                <ChevronLeft aria-hidden className="h-4 w-4" />
              </button>
              <button
                aria-label="Next page"
                className="btn-secondary inline-flex items-center gap-1 px-3 py-1.5 disabled:opacity-50"
                disabled={templateSafePage >= templatePageCount}
                onClick={() => setTemplatePage(templateSafePage + 1)}
                type="button"
              >
                <ChevronRight aria-hidden className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <p className="label-mono">Step 2</p>
          <h3 className="text-[15px] font-bold text-ink">Assignment details</h3>
        </div>

        {isFixed ? (
          <div className="rounded-[14px] bg-blue-soft px-4 py-3 text-sm text-ink">
            <p className="font-bold">
              Assigning to {fixedCount} SE{fixedCount === 1 ? "" : "s"}
            </p>
            {fixedNames.length > 0 ? <p className="text-ink-2">{fixedNames.join(", ")}</p> : null}
          </div>
        ) : (
          <>
            {canAssignAll ? (
              <div aria-label="Assign to" className="flex flex-wrap gap-2" role="group">
                <Chip active={assignMode === "one"} onClick={() => setAssignMode("one")}>
                  One SE
                </Chip>
                <Chip active={assignMode === "all"} onClick={() => setAssignMode("all")}>
                  All SEs ({teamOptions.length})
                </Chip>
              </div>
            ) : null}

            {assignMode === "one" ? (
              <label className={LABEL_CLASS}>
                <span className="block">Assign to</span>
                <select
                  className={INPUT_CLASS}
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
              <p className="rounded-[14px] bg-blue-soft px-4 py-3 text-sm text-ink">
                Will assign to <span className="font-bold">{teamOptions.length}</span> SEs:{" "}
                {teamOptions
                  .slice(0, 6)
                  .map((profile) => profile.fullName)
                  .join(", ")}
                {teamOptions.length > 6 ? ` +${teamOptions.length - 6} more` : ""}.
              </p>
            )}
          </>
        )}

        {showSolution ? (
          <>
            <label className={LABEL_CLASS}>
              <span className="block">Solution</span>
              <select
                className={INPUT_CLASS}
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
              <label className={LABEL_CLASS}>
                <span className="block">Custom solution</span>
                <input
                  className={INPUT_CLASS}
                  onChange={(e) => setCustomSolution(e.target.value)}
                  placeholder="Enter a solution"
                  required
                  value={customSolution}
                />
              </label>
            ) : null}
          </>
        ) : null}

        {showVerticalDifficulty ? (
          <>
            <label className={LABEL_CLASS}>
              <span className="block">Vertical</span>
              <select
                className={INPUT_CLASS}
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
            <label className={LABEL_CLASS}>
              <span className="block">Difficulty</span>
              <select
                className={INPUT_CLASS}
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

        <button
          className="btn-secondary inline-flex w-full items-center justify-center gap-2 disabled:opacity-50"
          disabled={isSaving || !templateId}
          type="submit"
        >
          {isSaving ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
          {submitLabel}
        </button>
      </form>
    </div>
  );
}
