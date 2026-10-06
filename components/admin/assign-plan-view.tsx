"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState, Field, LoadingState, SelectInput, TextInput } from "@/components/admin/admin-ui";
import { PlanPreviewDrawer } from "@/components/plans/plan-builder-preview";
import { Checkbox } from "@/components/ui/checkbox";
import { Chip } from "@/components/ui/chip";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { PersonCell, TableCard, TwoLineCell, rowHighlight, tdCls, thCls } from "@/components/ui/table";
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
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-US", {
    weekday: withWeekday ? "short" : undefined,
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

function firstName(name: string): string {
  return name.split(" ")[0] ?? name;
}

/** Programs › Assign (handoff 14a): pick a plan, pick people, set when. Uses the existing assignments API. */
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
    profiles.find((entry) => entry.id === profile.managerId)?.fullName ?? "None";
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
    { stage: 1, label: "1. Plan" },
    { stage: 2, label: "2. People" },
    { stage: 3, label: "3. When" },
  ];

  const canAdvance = stage === 1 ? Boolean(template) : stage === 2 ? selectedPeople.length > 0 : selectedPeople.length > 0 && Boolean(startDate);
  const primaryLabel =
    stage === 1
      ? "Next: people"
      : stage === 2
        ? "Next: when"
        : assigning
          ? "Assigning…"
          : `Assign to ${selectedPeople.length} SE${selectedPeople.length === 1 ? "" : "s"}`;

  function advance() {
    if (stage === 1) setStage(2);
    else if (stage === 2) setStage(3);
    else void assign();
  }

  const previewPerson = selectedPeople[0];
  const reviewerNames = [...new Set(selectedPeople.map((person) => managerName(person)).filter((name) => name !== "None"))];
  const mentorName = mentors.find((mentor) => mentor.id === mentorId)?.fullName;
  const chips = [
    { id: "no-plan" as const, label: "No plan", count: counts["no-plan"] },
    { id: "basic" as const, label: "Basic", count: counts.basic },
    { id: "recent" as const, label: "Joined in the last 30 days", count: counts.recent },
  ];

  return (
    <div className="flex flex-col">
      <PageHeader accent="Three steps." eyebrow="Programs / Assign" title="Assign a plan." />
      <PageBody className="flex flex-col gap-[22px] pb-10">
        <ol aria-label="Steps" className="flex max-w-[720px] gap-3">
          {stageCells.map((cell) => {
            const done = cell.stage < stage;
            const current = cell.stage === stage;
            return (
              <li className="flex-1" key={cell.stage}>
                <button
                  aria-current={current ? "step" : undefined}
                  className="flex w-full flex-col gap-2 text-left disabled:cursor-default"
                  disabled={!done}
                  onClick={() => setStage(cell.stage)}
                  type="button"
                >
                  <span aria-hidden className={cn("h-2 rounded-[2px]", done ? "bg-blue" : current ? "bg-signal" : "bg-track")} />
                  <span className={cn("text-sm", done || current ? "font-bold text-ink" : "font-medium text-muted")}>
                    {cell.label}
                    {cell.stage === 1 && template && stage > 1 ? <span className="font-medium text-muted">: {template.name}</span> : null}
                    <span className="sr-only">{done ? " (done)" : current ? " (current)" : ""}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="grid items-start gap-8 min-[1100px]:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex min-w-0 flex-col gap-3.5">
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
                          "grid cursor-pointer grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-4 border-t border-divider px-5 py-[13px] first:border-t-0",
                          checked ? rowHighlight.selected : "hover:bg-bg",
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
                        <TwoLineCell subline={entry.description ?? undefined} title={entry.name} />
                        <span className="text-[13px] whitespace-nowrap text-muted">
                          {entry.steps.length} steps over {Math.ceil(days / 7)} weeks, {assigned} active
                        </span>
                      </label>
                    );
                  })
                )}
              </fieldset>
            ) : null}

            {templates && stage === 2 ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  {chips.map((chip) => (
                    <Chip
                      active={filter === chip.id}
                      count={chip.count}
                      key={chip.id}
                      onClick={() => setFilter(filter === chip.id ? null : chip.id)}
                    >
                      {chip.label}
                    </Chip>
                  ))}
                  <TextInput
                    aria-label="Search people"
                    className="ml-auto w-[220px] rounded-full py-[7px] text-sm max-sm:ml-0 max-sm:w-full"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search people"
                    type="search"
                    value={query}
                  />
                </div>
                <TableCard minWidth={680}>
                  <caption className="sr-only">SEs to assign</caption>
                  <thead>
                    <tr>
                      <th className={cn(thCls, "w-[52px]")} scope="col">
                        <Checkbox
                          checked={allVisibleSelected}
                          disabled={selectable.length === 0}
                          label="Select everyone shown"
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
                        />
                      </th>
                      <th className={thCls} scope="col">
                        Name
                      </th>
                      <th className={cn(thCls, "w-[110px]")} scope="col">
                        Level
                      </th>
                      <th className={cn(thCls, "w-[140px]")} scope="col">
                        Manager
                      </th>
                      <th className={cn(thCls, "w-[100px]")} scope="col">
                        Joined
                      </th>
                      <th className={cn(thCls, "w-[150px]")} scope="col">
                        Plan
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.length === 0 ? (
                      <tr>
                        <td colSpan={6}>
                          <EmptyState>No SEs match this filter.</EmptyState>
                        </td>
                      </tr>
                    ) : (
                      visible.map((profile, index) => {
                        const already = hasThisPlan(profile.id);
                        const isSelected = selected.has(profile.id);
                        const current = activePlansByUser.get(profile.id)?.[0];
                        const cell = cn(tdCls, index === 0 && "border-t-0");
                        return (
                          <tr className={isSelected ? rowHighlight.ready : undefined} key={profile.id}>
                            <td className={cell}>
                              <Checkbox
                                checked={isSelected}
                                disabled={already}
                                label={`Select ${profile.fullName}`}
                                onChange={() => toggle(profile.id)}
                              />
                            </td>
                            <td className={cell}>
                              <PersonCell initials={initials(profile.fullName)} name={profile.fullName} />
                            </td>
                            <td className={cn(cell, "text-sm text-ink-2")}>{profile.level}</td>
                            <td className={cn(cell, "text-sm text-ink-2")}>{managerName(profile)}</td>
                            <td className={cn(cell, "text-sm text-muted")}>{formatDay(profile.createdAt.slice(0, 10))}</td>
                            <td className={cn(cell, "text-sm")}>
                              {already ? (
                                <span className="text-ink-2">Has this plan</span>
                              ) : current ? (
                                <span className="text-ink-2">{current.name}</span>
                              ) : (
                                <span className="font-semibold text-warning">No plan</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </TableCard>
                <p className="text-[13px] text-muted">Gate and step reviews go to each SE&apos;s own manager.</p>
              </>
            ) : null}

            {templates && stage === 3 ? (
              <div className="flex flex-col gap-4 rounded-[14px] border border-line bg-white px-[22px] py-5">
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
                  <Field hint="Optional. Applies to everyone in this assignment." htmlFor="assign-mentor" label="Mentor">
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
                    <li className="flex justify-between gap-4 border-t border-divider py-2.5 first:border-t-0" key={person.id}>
                      <span className="font-semibold text-ink">{person.fullName}</span>
                      <span className="text-ink-2">Reviewed by {managerName(person)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <aside
            aria-label="Assignment summary"
            className="on-navy flex flex-col gap-[18px] rounded-[16px] bg-navy p-[26px] text-white"
          >
            <p className="text-[22px] leading-[1.4] font-bold">
              Assign <span className="text-signal">{template?.name ?? "a plan"}</span> to{" "}
              <span className="text-signal">
                {selectedPeople.length} SE{selectedPeople.length === 1 ? "" : "s"}
              </span>
              , starting <span className="text-signal">{formatDay(startDate, true)}</span>.
            </p>
            <dl className="m-0 flex flex-col">
              {[
                {
                  term: "First step due",
                  value: firstDue !== null ? formatDay(addDaysToIsoDate(startDate, firstDue), true) : "Pick a plan",
                },
                {
                  term: "Field ready by",
                  value: duration !== null ? formatDay(addDaysToIsoDate(startDate, duration), true) : "Pick a plan",
                },
                {
                  term: "Reviewers",
                  value: reviewerNames.length ? reviewerNames.join(", ") : selectedPeople.length ? "No manager set" : "Pick people",
                },
                { term: "Mentor", value: mentorName ?? (stage < 3 ? "Set in the next step" : "None") },
              ].map((row) => (
                <div className="flex justify-between gap-3 border-t border-navy-line py-2.5 text-sm" key={row.term}>
                  <dt className="text-on-navy-muted">{row.term}</dt>
                  <dd className="m-0 text-right font-semibold text-white">{row.value}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap items-center gap-4">
              <button className="btn-primary" disabled={!canAdvance || assigning} onClick={advance} type="button">
                {primaryLabel}
              </button>
              {template && previewPerson ? (
                <button className="link text-sm" onClick={() => setPreviewOpen(true)} type="button">
                  Preview as {firstName(previewPerson.fullName)}
                </button>
              ) : null}
            </div>
          </aside>
        </div>
      </PageBody>

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
