"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState, Field, LoadingState, SelectInput, TextInput } from "@/components/admin/admin-ui";
import { PlanPreviewDrawer } from "@/components/plans/plan-builder-preview";
import { Tag } from "@/components/ui/tag";
import { templateToBuilderSteps, type DbTemplate } from "@/lib/admin/plan-builder";
import { addDaysToIsoDate, sortPlanTemplates, templateDurationDays } from "@/lib/plans/template-catalog";
import type { Profile, UserPlan } from "@/lib/types";
import { cn } from "@/lib/utils";

type Stage = 1 | 2 | 3;
type PeopleFilter = "no-plan" | "basic" | "recent" | null;

const DAY_MS = 24 * 60 * 60 * 1000;

function nextMondayIso(now = new Date()): string {
  const date = new Date(now);
  const add = ((8 - date.getDay()) % 7) || 7;
  date.setDate(date.getDate() + add);
  return date.toISOString().slice(0, 10);
}

function formatDay(iso: string, withWeekday = false): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
    weekday: withWeekday ? "short" : undefined,
    month: "short",
    day: "numeric",
  });
}

function firstName(name: string): string {
  return name.split(" ")[0] ?? name;
}

/** Programs › Assign (handoff 14a): pick a plan, pick who, set when. Uses the existing assignments API. */
export function AssignPlanView({
  assignees,
  mentors,
  plans,
  profiles,
}: {
  assignees: Profile[];
  mentors: Profile[];
  plans: UserPlan[];
  profiles: Profile[];
}) {
  const router = useRouter();
  const [templates, setTemplates] = useState<DbTemplate[] | null>(null);
  const [stage, setStage] = useState<Stage>(1);
  const [planId, setPlanId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<PeopleFilter>(null);
  const [filterInitialised, setFilterInitialised] = useState(false);
  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState(nextMondayIso());
  const [mentorId, setMentorId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [localPlans, setLocalPlans] = useState(plans);

  useEffect(() => setLocalPlans(plans), [plans]);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/plans/templates");
      if (!response.ok) {
        toast.error("Failed to load plan templates.");
        setTemplates([]);
        return;
      }
      const body = (await response.json()) as { templates: DbTemplate[] };
      setTemplates(sortPlanTemplates(body.templates ?? []));
    })();
  }, []);

  const template = templates?.find((entry) => entry.id === planId) ?? null;
  const builderSteps = useMemo(() => (template ? templateToBuilderSteps(template) : []), [template]);

  const activePlansByUser = useMemo(() => {
    const map = new Map<string, UserPlan[]>();
    for (const plan of localPlans) {
      if (plan.status === "completed") continue;
      map.set(plan.userId, [...(map.get(plan.userId) ?? []), plan]);
    }
    return map;
  }, [localPlans]);

  const people = useMemo(
    () => assignees.filter((profile) => ["basic_se", "senior_se", "advisory_solutions_consultant"].includes(profile.role)),
    [assignees],
  );
  const now = Date.now();
  const matches = {
    "no-plan": (profile: Profile) => !activePlansByUser.has(profile.id),
    basic: (profile: Profile) => profile.level === "Basic",
    recent: (profile: Profile) => now - new Date(profile.createdAt).getTime() <= 30 * DAY_MS,
  } as const;
  const counts = {
    "no-plan": people.filter(matches["no-plan"]).length,
    basic: people.filter(matches.basic).length,
    recent: people.filter(matches.recent).length,
  };
  const noPlanCount = counts["no-plan"];

  useEffect(() => {
    if (filterInitialised) return;
    setFilter(noPlanCount > 0 ? "no-plan" : null);
    setFilterInitialised(true);
  }, [noPlanCount, filterInitialised]);

  const visible = people.filter(
    (profile) =>
      (!filter || matches[filter](profile)) &&
      (!query.trim() ||
        `${profile.fullName} ${profile.email}`.toLowerCase().includes(query.trim().toLowerCase())),
  );

  const hasThisPlan = (profileId: string) =>
    Boolean(planId && activePlansByUser.get(profileId)?.some((plan) => plan.planTemplateId === planId));
  const selectable = visible.filter((profile) => !hasThisPlan(profile.id));
  const allVisibleSelected = selectable.length > 0 && selectable.every((profile) => selected.has(profile.id));

  const selectedPeople = people.filter((profile) => selected.has(profile.id));
  const managerName = (profile: Profile) =>
    profiles.find((entry) => entry.id === profile.managerId)?.fullName ?? "—";
  const reviewerCount = new Set(selectedPeople.map((profile) => profile.managerId).filter(Boolean)).size;
  const firstDue = builderSteps.length ? Math.min(...builderSteps.map((step) => step.dueOffsetDays)) : null;
  const duration = template ? templateDurationDays(template.steps) : null;

  function toggle(profileId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(profileId)) next.delete(profileId);
      else next.add(profileId);
      return next;
    });
  }

  function choosePlan(id: string) {
    setPlanId(id);
    // Drop anyone who already has the newly chosen plan.
    setSelected((current) => {
      const next = new Set(current);
      for (const userId of current) {
        if (activePlansByUser.get(userId)?.some((plan) => plan.planTemplateId === id)) next.delete(userId);
      }
      return next;
    });
  }

  async function assign() {
    if (!template || selectedPeople.length === 0) return;
    setAssigning(true);
    const targetCompletion = addDaysToIsoDate(startDate, templateDurationDays(template.steps));
    const failures: string[] = [];
    const created: UserPlan[] = [];
    for (const person of selectedPeople) {
      const response = await fetch("/api/plans/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: template.id,
          userId: person.id,
          mentorId: mentorId || null,
          startDate,
          targetCompletion,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
        failures.push(`${person.fullName}: ${typeof body?.error === "string" ? body.error : "failed"}`);
        continue;
      }
      const body = (await response.json().catch(() => ({}))) as { id?: string };
      created.push({
        id: body.id ?? `${template.id}-${person.id}`,
        planTemplateId: template.id,
        userId: person.id,
        mentorId: mentorId || null,
        name: template.name,
        startDate,
        targetCompletion,
        status: "not_started",
        progress: 0,
        steps: [],
      });
    }
    setAssigning(false);
    setLocalPlans((current) => [...current, ...created]);
    if (created.length) {
      toast.success(`${template.name} assigned to ${created.length} SE${created.length === 1 ? "" : "s"}.`);
      setSelected(new Set());
      setStage(2);
      router.refresh();
    }
    if (failures.length) toast.error(`Not assigned: ${failures.join("; ")}`);
  }

  const stageCells: { stage: Stage; label: string }[] = [
    { stage: 1, label: template ? `01 Plan · ${template.name}` : "01 Plan" },
    { stage: 2, label: stage > 2 && selectedPeople.length ? `02 Who · ${selectedPeople.length} SEs` : "02 Who" },
    { stage: 3, label: "03 When" },
  ];

  const canAdvance = stage === 1 ? Boolean(template) : stage === 2 ? selectedPeople.length > 0 : selectedPeople.length > 0 && Boolean(startDate);
  const primaryLabel =
    stage === 1
      ? "Next: who"
      : stage === 2
        ? "Next: when"
        : assigning
          ? "Assigning…"
          : `Assign ${selectedPeople.length} SE${selectedPeople.length === 1 ? "" : "s"}`;

  function advance() {
    if (stage === 1) setStage(2);
    else if (stage === 2) setStage(3);
    else void assign();
  }

  const previewPerson = selectedPeople[0];

  return (
    <div className="flex flex-col">
      <header className="flex flex-col gap-3.5 px-[var(--gutter)] pt-7 pb-[18px]">
        <h1 className="text-[30px] leading-[1.1] font-extrabold tracking-[-0.02em] text-ink">Assign a ramp plan</h1>
        <ol aria-label="Steps" className="flex flex-col gap-1.5 font-mono text-xs uppercase sm:flex-row">
          {stageCells.map((cell) => {
            const done = cell.stage < stage;
            const current = cell.stage === stage;
            return (
              <li className="flex-1" key={cell.stage}>
                <button
                  aria-current={current ? "step" : undefined}
                  className={cn(
                    "w-full truncate rounded-[10px] px-3 py-2 text-left",
                    done && "bg-blue text-white",
                    current && "border-[1.5px] border-ink bg-signal text-ink",
                    !done && !current && "border-[1.5px] border-dashed border-dash text-muted",
                  )}
                  disabled={!done}
                  onClick={() => setStage(cell.stage)}
                  type="button"
                >
                  {done ? "✓ " : current ? "● " : "○ "}
                  {cell.label}
                </button>
              </li>
            );
          })}
        </ol>
      </header>

      <div className="grid gap-7 px-[var(--gutter)] pb-7 min-[1100px]:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-3">
          {templates === null ? <LoadingState label="Loading plans…" /> : null}

          {templates && stage === 1 ? (
            <fieldset className="overflow-hidden rounded-[14px] border border-line bg-white">
              <legend className="sr-only">Choose a plan</legend>
              {templates.length === 0 ? (
                <EmptyState>No plans yet. Build one in the Plan builder first.</EmptyState>
              ) : (
                templates.map((entry) => {
                  const days = templateDurationDays(entry.steps);
                  const assigned = localPlans.filter(
                    (plan) => plan.planTemplateId === entry.id && plan.status !== "completed",
                  ).length;
                  const checked = entry.id === planId;
                  return (
                    <label
                      className={cn(
                        "grid cursor-pointer grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 border-b border-divider px-[18px] py-[13px] text-sm last:border-b-0",
                        checked && "bg-signal-soft",
                      )}
                      key={entry.id}
                    >
                      <input
                        checked={checked}
                        className="h-[18px] w-[18px] accent-[var(--color-blue)]"
                        name="assign-plan"
                        onChange={() => choosePlan(entry.id)}
                        type="radio"
                      />
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-[15px] font-bold text-ink">{entry.name}</span>
                        {entry.description ? <span className="truncate text-[13px] text-ink-2">{entry.description}</span> : null}
                      </span>
                      <span className="font-mono text-xs whitespace-nowrap text-muted uppercase">
                        {entry.steps.length} steps · {Math.ceil(days / 7)} wks · {assigned} active
                      </span>
                    </label>
                  );
                })
              )}
            </fieldset>
          ) : null}

          {templates && stage === 2 ? (
            <>
              <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold">
                {(
                  [
                    { id: "no-plan", label: `No plan · ${counts["no-plan"]}` },
                    { id: "basic", label: `Basic · ${counts.basic}` },
                    { id: "recent", label: `Joined last 30 days · ${counts.recent}` },
                  ] as const
                ).map((chip) => (
                  <button
                    aria-pressed={filter === chip.id}
                    className={cn(
                      "rounded-full px-3 py-1.5",
                      filter === chip.id ? "bg-ink text-white" : "border-[1.5px] border-line-strong text-ink hover:bg-blue-soft",
                    )}
                    key={chip.id}
                    onClick={() => setFilter(filter === chip.id ? null : chip.id)}
                    type="button"
                  >
                    {chip.label}
                  </button>
                ))}
                <TextInput
                  aria-label="Search people"
                  className="ml-auto w-[200px] py-1.5 text-[13px] font-normal"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search people"
                  type="search"
                  value={query}
                />
              </div>
              <div className="overflow-hidden rounded-[14px] border border-line bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                    <caption className="sr-only">SEs to assign</caption>
                    <thead>
                      <tr className="border-b border-line font-mono text-xs text-muted uppercase">
                        <th className="w-[54px] py-2.5 pr-3 pl-[18px] font-medium" scope="col">
                          <input
                            aria-label="Select all shown"
                            checked={allVisibleSelected}
                            className="h-[18px] w-[18px] align-middle accent-[var(--color-blue)]"
                            disabled={selectable.length === 0}
                            onChange={() =>
                              setSelected((current) => {
                                const next = new Set(current);
                                for (const profile of selectable) {
                                  if (allVisibleSelected) next.delete(profile.id);
                                  else next.add(profile.id);
                                }
                                return next;
                              })
                            }
                            type="checkbox"
                          />
                        </th>
                        <th className="px-3 py-2.5 font-medium" scope="col">SE</th>
                        <th className="w-[110px] px-3 py-2.5 font-medium" scope="col">Level</th>
                        <th className="w-[130px] px-3 py-2.5 font-medium" scope="col">Joined</th>
                        <th className="w-[160px] py-2.5 pr-[18px] pl-3 font-medium" scope="col">Manager</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.length === 0 ? (
                        <tr>
                          <td colSpan={5}>
                            <EmptyState>No SEs match this filter.</EmptyState>
                          </td>
                        </tr>
                      ) : (
                        visible.map((profile) => {
                          const already = hasThisPlan(profile.id);
                          const isSelected = selected.has(profile.id);
                          return (
                            <tr
                              className={cn("border-b border-divider last:border-b-0", isSelected && "bg-signal-soft")}
                              key={profile.id}
                            >
                              <td className="py-[13px] pr-3 pl-[18px]">
                                <input
                                  aria-label={`Select ${profile.fullName}`}
                                  checked={isSelected}
                                  className="h-[18px] w-[18px] align-middle accent-[var(--color-blue)]"
                                  disabled={already}
                                  onChange={() => toggle(profile.id)}
                                  type="checkbox"
                                />
                              </td>
                              <td className="px-3 py-[13px]">
                                <span className={cn("text-ink", isSelected && "font-bold")}>{profile.fullName}</span>
                                {already ? (
                                  <Tag className="ml-2" tone="blue">
                                    ✓ Has this plan
                                  </Tag>
                                ) : null}
                              </td>
                              <td className="px-3 py-[13px] text-ink">{profile.level}</td>
                              <td className="px-3 py-[13px] font-mono text-[13px] text-ink uppercase">
                                {formatDay(profile.createdAt.slice(0, 10))}
                              </td>
                              <td className="py-[13px] pr-[18px] pl-3 text-ink">{managerName(profile)}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <p className="text-[13px] text-muted">Gate and step reviews go to each SE&apos;s own manager.</p>
            </>
          ) : null}

          {templates && stage === 3 ? (
            <div className="flex flex-col gap-4 rounded-[14px] border border-line bg-white px-5 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  hint="The SE gets the plan on Today the morning of this date."
                  htmlFor="assign-start"
                  label="Start date"
                >
                  <TextInput
                    id="assign-start"
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(event) => setStartDate(event.target.value)}
                    required
                    type="date"
                    value={startDate}
                  />
                </Field>
                <Field hint="Optional. Applies to every SE in this assignment." htmlFor="assign-mentor" label="Mentor">
                  <SelectInput id="assign-mentor" onChange={(event) => setMentorId(event.target.value)} value={mentorId}>
                    <option value="">No mentor</option>
                    {mentors.map((mentor) => (
                      <option key={mentor.id} value={mentor.id}>
                        {mentor.fullName}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
              </div>
              <ul className="flex flex-col text-sm">
                {selectedPeople.map((person) => (
                  <li className="flex justify-between border-b border-divider py-2 last:border-b-0" key={person.id}>
                    <span className="font-semibold text-ink">{person.fullName}</span>
                    <span className="text-ink-2">Reviews: {managerName(person)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <aside
          aria-label="Assignment summary"
          className="flex flex-col gap-3.5 self-start rounded-[18px] bg-badge p-[22px] text-white"
        >
          <span className="font-mono text-xs text-signal uppercase">Summary</span>
          <p className="text-xl leading-[1.35] font-bold">
            Assign <span className="text-signal">{template?.name ?? "a plan"}</span> to{" "}
            <span className="text-signal">
              {selectedPeople.length} SE{selectedPeople.length === 1 ? "" : "s"}
            </span>
            , starting <span className="text-signal">{formatDay(startDate, true)}</span>.
          </p>
          <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 border-t border-dashed border-badge-line pt-3 text-sm text-on-blue">
            <dt>First step due</dt>
            <dd className="m-0 text-white">
              {firstDue !== null ? formatDay(addDaysToIsoDate(startDate, firstDue), true) : "—"}
            </dd>
            <dt>Field ready by</dt>
            <dd className="m-0 text-white">{duration !== null ? formatDay(addDaysToIsoDate(startDate, duration)) : "—"}</dd>
            <dt>Reviewers</dt>
            <dd className="m-0 text-white">
              {selectedPeople.length ? `${reviewerCount} manager${reviewerCount === 1 ? "" : "s"}` : "—"}
            </dd>
          </dl>
          <div className="mt-1 flex flex-wrap items-center gap-4">
            <button
              className="btn-primary"
              disabled={!canAdvance || assigning}
              onClick={advance}
              style={
                canAdvance && !assigning
                  ? { padding: "9px 20px", fontSize: 14, borderColor: "var(--color-signal)", boxShadow: "3px 3px 0 var(--color-blue)" }
                  : { padding: "9px 20px", fontSize: 14 }
              }
              type="button"
            >
              {primaryLabel}
            </button>
            {template && previewPerson ? (
              <button
                className="text-sm font-bold text-white underline decoration-signal decoration-2 underline-offset-[3px] hover:decoration-white"
                onClick={() => setPreviewOpen(true)}
                type="button"
              >
                Preview as {firstName(previewPerson.fullName)}
              </button>
            ) : null}
          </div>
        </aside>
      </div>

      <PlanPreviewDrawer
        name={template?.name ?? ""}
        onClose={() => setPreviewOpen(false)}
        open={previewOpen}
        personName={previewPerson ? firstName(previewPerson.fullName) : undefined}
        startDate={startDate}
        steps={builderSteps}
      />
    </div>
  );
}
