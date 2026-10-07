"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Drawer } from "@/components/ui/drawer";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { Tabs } from "@/components/ui/tabs";
import { Tag } from "@/components/ui/tag";
import { TableCard, PersonCell, tdCls, thCls } from "@/components/ui/table";
import {
  BUILDER_STEP_TYPES,
  REVIEWER_OPTIONS,
  templateToBuilderSteps,
  type DbTemplate,
} from "@/lib/admin/plan-builder";
import { addDaysToIsoDate, templateDurationDays } from "@/lib/plans/template-catalog";
import {
  PROGRAM_PHASES,
  PROGRAM_WEEKS,
  isStepOverdue,
  phaseOfStep,
  stepWeek,
  type EnrollmentSummary,
  type PhaseStatus,
  type ProgramSummary,
} from "@/lib/programs/program-model";
import { isStepValidated } from "@/lib/se/ramp-model";
import type { PlanStep, Profile } from "@/lib/types";
import { cn, initials } from "@/lib/utils";

const PlanBuilder = dynamic(() => import("@/components/plans/plan-builder").then((mod) => mod.PlanBuilder), {
  ssr: false,
  loading: () => <p className="py-16 text-center text-sm text-muted">Loading the outline editor…</p>,
});

export type ProgramTab = "progress" | "outline" | "people" | "schedule";

const PHASE_TONE: Record<PhaseStatus, { tone: StatusTone; label: string }> = {
  complete: { tone: "success", label: "Complete" },
  active: { tone: "blue", label: "In progress" },
  overdue: { tone: "danger", label: "Overdue" },
  upcoming: { tone: "neutral", label: "Upcoming" },
  empty: { tone: "neutral", label: "No steps" },
};

const HEALTH: Record<EnrollmentSummary["health"], { tone: StatusTone; label: string }> = {
  complete: { tone: "success", label: "Complete" },
  on_track: { tone: "success", label: "On track" },
  at_risk: { tone: "danger", label: "At risk" },
  not_started: { tone: "neutral", label: "Not started" },
};

function typeLabel(type: string | null) {
  return BUILDER_STEP_TYPES.find((entry) => entry.type === type)?.label ?? "Task";
}

function shortDate(iso: string | undefined | null) {
  if (!iso) return "—";
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function stepStatus(step: PlanStep, today: string): { tone: StatusTone; label: string } {
  if (isStepValidated(step.status)) return { tone: "success", label: "Done" };
  if (isStepOverdue(step, today)) return { tone: "danger", label: "Overdue" };
  if (step.status === "submitted" || step.status === "under_review") return { tone: "warning", label: "In review" };
  if (step.status === "in_progress") return { tone: "blue", label: "In progress" };
  return { tone: "neutral", label: "Not started" };
}

/**
 * The program workbench: everything about one program in one place. Progress (who is where),
 * Outline (what the program asks), People (who's enrolled, enroll more) and Schedule (13 weeks).
 * Admins edit the outline here; managers see it read-only.
 */
export function ProgramWorkbench({
  program,
  template,
  canEdit,
  isNew = false,
  candidates,
  mentors,
  initialTab = "progress",
  startEditing = false,
  focusStepId = null,
  addStep = false,
  onClose,
  onChanged,
  onCreated,
}: {
  program: ProgramSummary | null;
  template: DbTemplate | null;
  canEdit: boolean;
  isNew?: boolean;
  /** SEs this viewer may enroll. */
  candidates: Profile[];
  mentors: Profile[];
  initialTab?: ProgramTab;
  /** Open straight into the outline editor (e.g. adding a practice item from the library). */
  startEditing?: boolean;
  /** From the timeline: open the editor on this step, or with a new step added. */
  focusStepId?: string | null;
  addStep?: boolean;
  onClose: () => void;
  onChanged: () => void;
  onCreated?: (id: string) => void;
}) {
  const [tab, setTab] = useState<ProgramTab>(isNew || startEditing ? "outline" : initialTab);
  const [editing, setEditing] = useState(isNew || startEditing);
  const [personId, setPersonId] = useState<string | null>(null);
  const enrollments = program?.enrollments ?? [];
  const person = enrollments.find((item) => item.plan.userId === personId) ?? null;
  const name = program?.name ?? template?.name ?? "New program";

  const subtitle = isNew
    ? "Outline the phases and steps, then publish to start enrolling people."
    : `${program?.stepCount ?? 0} steps over ${PROGRAM_WEEKS} weeks, ${enrollments.length} ${
        enrollments.length === 1 ? "person" : "people"
      } enrolled${program?.atRisk ? `, ${program.atRisk} at risk` : ""}`;

  return (
    <Drawer
      bodyWidth="full"
      eyebrow="Program"
      footerNote={editing ? "Publish saves the outline; people already enrolled keep their dates." : "Esc closes."}
      onClose={onClose}
      open
      subtitle={subtitle}
      title={name}
    >
      <div className="flex flex-col gap-6">
        {!isNew ? (
          <Tabs
            items={[
              { id: "progress", label: "Progress" },
              { id: "outline", label: "Outline", count: program?.stepCount ?? 0 },
              { id: "people", label: "People", count: enrollments.length },
              { id: "schedule", label: "Schedule" },
            ]}
            label="Program views"
            onChange={(id) => {
              setTab(id as ProgramTab);
              setPersonId(null);
              setEditing(false);
            }}
            value={tab}
          />
        ) : null}

        {tab === "progress" ? (
          person ? (
            <Journey enrollment={person} onBack={() => setPersonId(null)} showCoaching={!canEdit} />
          ) : (
            <ProgressGrid enrollments={enrollments} onOpen={setPersonId} onEnroll={() => setTab("people")} />
          )
        ) : null}

        {tab === "outline" ? (
          editing && canEdit ? (
            <div className="-mx-5 overflow-hidden rounded-[14px] border border-line bg-white sm:-mx-8">
              <PlanBuilder
                addStep={addStep}
                embedded
                focusStepId={focusStepId}
                lockedPlanId={isNew ? null : (template?.id ?? null)}
                onDeleted={() => {
                  onChanged();
                  onClose();
                }}
                onPublished={(id) => {
                  setEditing(false);
                  onChanged();
                  if (isNew) onCreated?.(id);
                }}
              />
            </div>
          ) : (
            <Outline canEdit={canEdit} onEdit={() => setEditing(true)} template={template} />
          )
        ) : null}

        {tab === "people" && program ? (
          <People
            candidates={candidates}
            enrollments={enrollments}
            mentors={mentors}
            onChanged={onChanged}
            onOpen={(id) => {
              setTab("progress");
              setPersonId(id);
            }}
            template={template}
          />
        ) : null}

        {tab === "schedule" ? <Schedule enrollments={enrollments} /> : null}
      </div>
    </Drawer>
  );
}

function PhaseCell({ phase }: { phase: EnrollmentSummary["phases"][number] }) {
  const meta = PHASE_TONE[phase.status];
  return (
    <span className="flex flex-col gap-0.5">
      <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
      {phase.total > 0 ? (
        <span className="num text-[12px] text-muted">
          {phase.done} of {phase.total}
        </span>
      ) : null}
    </span>
  );
}

function ProgressGrid({
  enrollments,
  onOpen,
  onEnroll,
}: {
  enrollments: EnrollmentSummary[];
  onOpen: (userId: string) => void;
  onEnroll: () => void;
}) {
  if (enrollments.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-[14px] border border-dashed border-line-strong bg-white px-6 py-8">
        <p className="text-[15px] font-bold text-ink">Nobody is enrolled yet.</p>
        <p className="text-sm text-ink-2">Enroll SEs from the People tab and their progress shows here, phase by phase.</p>
        <button className="btn-primary" onClick={onEnroll} type="button">
          Enroll people
        </button>
      </div>
    );
  }

  return (
    <TableCard minWidth={880}>
      <caption className="sr-only">Progress by phase. Open a row to see that person&apos;s journey.</caption>
      <thead>
        <tr>
          <th className={thCls} scope="col">
            SE
          </th>
          {PROGRAM_PHASES.map((phase) => (
            <th className={thCls} key={phase.index} scope="col">
              {phase.name}
            </th>
          ))}
          <th className={cn(thCls, "text-right")} scope="col">
            Overall
          </th>
        </tr>
      </thead>
      <tbody>
        {enrollments.map((item) => (
          <tr
            className={cn("cursor-pointer hover:bg-[#FBF9F5]", item.health === "at_risk" && "bg-danger-row")}
            key={item.plan.id}
            onClick={() => onOpen(item.plan.userId)}
          >
            <td className={cn(tdCls, "py-3")}>
              <button
                className="text-left"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpen(item.plan.userId);
                }}
                type="button"
              >
                <PersonCell
                  initials={initials(item.person?.fullName ?? "SE")}
                  name={item.person?.fullName ?? "Former team member"}
                  subline={`Week ${item.week} of ${PROGRAM_WEEKS}${item.overdue ? `, ${item.overdue} overdue` : ""}`}
                />
              </button>
            </td>
            {item.phases.map((phase) => (
              <td className={cn(tdCls, "py-3")} key={phase.index}>
                <PhaseCell phase={phase} />
              </td>
            ))}
            <td className={cn(tdCls, "py-3 text-right")}>
              <span className="flex flex-col items-end gap-1">
                <span className={cn("num text-lg font-extrabold", item.health === "at_risk" ? "text-danger" : "text-blue")}>
                  {item.progress}%
                </span>
                <StatusPill tone={HEALTH[item.health].tone}>{HEALTH[item.health].label}</StatusPill>
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </TableCard>
  );
}

function Journey({
  enrollment,
  onBack,
  showCoaching,
}: {
  enrollment: EnrollmentSummary;
  onBack: () => void;
  /** Managers jump to the SE in Coaching; admins don't have that view. */
  showCoaching: boolean;
}) {
  const today = todayIso();
  const steps = [...enrollment.plan.steps].sort((a, b) => a.order - b.order);
  const name = enrollment.person?.fullName ?? "Former team member";

  return (
    <div className="flex flex-col gap-5">
      <button className="link inline-flex items-center gap-1.5 self-start text-sm" onClick={onBack} type="button">
        <ArrowLeft aria-hidden className="h-4 w-4" />
        Everyone in this program
      </button>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PersonCell
          initials={initials(name)}
          name={<span className="text-[20px] font-extrabold">{name}</span>}
          subline={`Started ${shortDate(enrollment.plan.startDate)}, target ${shortDate(enrollment.plan.targetCompletion)}`}
        />
        <div className="flex items-center gap-6">
          <span className="flex flex-col items-end">
            <span className="label-caps">Progress</span>
            <span className="num text-[28px] font-extrabold text-blue">{enrollment.progress}%</span>
          </span>
          <span className="flex flex-col items-end">
            <span className="label-caps">Overdue</span>
            <span className={cn("num text-[28px] font-extrabold", enrollment.overdue ? "text-danger" : "text-blue")}>
              {enrollment.overdue}
            </span>
          </span>
          {enrollment.person && showCoaching ? (
            <Link className="btn-secondary no-underline" href={`/manager/coaching?profile=${enrollment.person.id}`}>
              Coaching view
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {PROGRAM_PHASES.map((phase) => {
          const phaseSteps = steps.filter((step, position) => phaseOfStep(step, position, steps.length) === phase.index);
          const progress = enrollment.phases[phase.index - 1]!;
          return (
            <section className="flex flex-col gap-3 rounded-[14px] border border-line bg-white p-4" key={phase.index}>
              <header className="flex items-start justify-between gap-3">
                <span className="flex flex-col gap-0.5">
                  <span className="label-caps">Phase {phase.index}</span>
                  <span className="text-[17px] font-extrabold text-ink">{phase.name}</span>
                </span>
                <PhaseCell phase={progress} />
              </header>
              {phaseSteps.length === 0 ? (
                <p className="text-sm text-muted">No steps in this phase.</p>
              ) : (
                <ol className="flex flex-col">
                  {phaseSteps.map((step) => {
                    const status = stepStatus(step, today);
                    return (
                      <li className="flex items-start justify-between gap-3 border-t border-divider py-2.5 first:border-t-0" key={step.id}>
                        <span className="flex min-w-0 flex-col gap-1">
                          <span className="text-sm font-bold text-ink">{step.title}</span>
                          <span className="flex flex-wrap items-center gap-2 text-[12px] text-muted">
                            <Tag>{typeLabel(step.type)}</Tag>
                            {step.isSegmentGate ? <Tag tone="blue">Gate</Tag> : null}
                            {step.dueDate ? <span>Due {shortDate(step.dueDate)}</span> : null}
                          </span>
                        </span>
                        <StatusPill tone={status.tone}>{status.label}</StatusPill>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Outline({ template, canEdit, onEdit }: { template: DbTemplate | null; canEdit: boolean; onEdit: () => void }) {
  const steps = useMemo(() => (template ? templateToBuilderSteps(template) : []), [template]);

  if (!template) {
    return <p className="text-sm text-muted">This program&apos;s outline isn&apos;t available to you.</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-[640px] text-[15px] text-ink-2">
          {template.description || "What every SE on this program works through, phase by phase."}
        </p>
        {canEdit ? (
          <button className="btn-primary" onClick={onEdit} type="button">
            Edit outline
          </button>
        ) : (
          <span className="text-[13px] text-muted">Enablement admins edit the outline.</span>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {PROGRAM_PHASES.map((phase) => {
          const phaseSteps = steps.filter(
            (step, position) => phaseOfStep({ segmentIndex: step.segmentIndex }, position, steps.length) === phase.index,
          );
          return (
            <section className="flex flex-col gap-3 rounded-[14px] border border-line bg-white p-4" key={phase.index}>
              <header className="flex flex-col gap-0.5">
                <span className="label-caps">Phase {phase.index}</span>
                <span className="text-[17px] font-extrabold text-ink">{phase.name}</span>
                <span className="text-[13px] text-muted">{phase.summary}</span>
              </header>
              {phaseSteps.length === 0 ? (
                <p className="text-sm text-muted">No steps yet.</p>
              ) : (
                <ol className="flex flex-col">
                  {phaseSteps.map((step) => (
                    <li className="flex items-start justify-between gap-3 border-t border-divider py-2.5 first:border-t-0" key={step.key}>
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="text-sm font-bold text-ink">{step.title || "Untitled step"}</span>
                        <span className="flex flex-wrap items-center gap-2 text-[12px] text-muted">
                          <Tag>{typeLabel(step.stepType)}</Tag>
                          {step.isSegmentGate ? <Tag tone="blue">Gate</Tag> : null}
                          {step.reviewer ? (
                            <span>Reviewed by {REVIEWER_OPTIONS.find((option) => option.id === step.reviewer)?.label ?? step.reviewer}</span>
                          ) : null}
                        </span>
                      </span>
                      <span className="num shrink-0 text-[13px] text-muted">
                        Week {Math.min(PROGRAM_WEEKS, Math.ceil(step.dueOffsetDays / 7))}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function People({
  enrollments,
  candidates,
  mentors,
  template,
  onChanged,
  onOpen,
}: {
  enrollments: EnrollmentSummary[];
  candidates: Profile[];
  mentors: Profile[];
  template: DbTemplate | null;
  onChanged: () => void;
  onOpen: (userId: string) => void;
}) {
  const enrolledIds = new Set(enrollments.map((item) => item.plan.userId));
  const available = candidates.filter((person) => !enrolledIds.has(person.id));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState(todayIso());
  const [mentorId, setMentorId] = useState("");
  const [saving, setSaving] = useState(false);
  const mentorName = (id: string | null) => mentors.find((mentor) => mentor.id === id)?.fullName ?? "None";

  async function enroll() {
    if (!template || selected.size === 0) return;
    setSaving(true);
    const targetCompletion = addDaysToIsoDate(startDate, templateDurationDays(template.steps));
    const failures: string[] = [];
    for (const userId of selected) {
      const response = await fetch("/api/plans/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: template.id, userId, mentorId: mentorId || null, startDate, targetCompletion }),
      }).catch(() => null);
      if (!response?.ok) {
        const body = (await response?.json().catch(() => null)) as { error?: unknown } | null;
        const who = candidates.find((person) => person.id === userId)?.fullName ?? "Someone";
        failures.push(`${who}: ${typeof body?.error === "string" ? body.error : "failed"}`);
      }
    }
    setSaving(false);
    const added = selected.size - failures.length;
    if (added > 0) toast.success(`${added} ${added === 1 ? "person" : "people"} enrolled.`);
    if (failures.length) toast.error(failures.join(". "));
    setSelected(new Set());
    onChanged();
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="flex min-w-0 flex-col gap-3">
        <h3 className="label-caps">Enrolled ({enrollments.length})</h3>
        {enrollments.length === 0 ? (
          <p className="text-sm text-muted">Nobody yet. Pick people on the right to enroll them.</p>
        ) : (
          <TableCard minWidth={620}>
            <thead>
              <tr>
                <th className={thCls} scope="col">
                  SE
                </th>
                <th className={thCls} scope="col">
                  Mentor
                </th>
                <th className={thCls} scope="col">
                  Started
                </th>
                <th className={cn(thCls, "text-right")} scope="col">
                  Progress
                </th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((item) => (
                <tr className="cursor-pointer hover:bg-[#FBF9F5]" key={item.plan.id} onClick={() => onOpen(item.plan.userId)}>
                  <td className={cn(tdCls, "py-3")}>
                    <PersonCell
                      initials={initials(item.person?.fullName ?? "SE")}
                      name={item.person?.fullName ?? "Former team member"}
                      subline={HEALTH[item.health].label}
                    />
                  </td>
                  <td className={cn(tdCls, "text-sm text-ink-2")}>{mentorName(item.plan.mentorId)}</td>
                  <td className={cn(tdCls, "text-sm text-ink-2")}>{shortDate(item.plan.startDate)}</td>
                  <td className={cn(tdCls, "num text-right font-bold text-ink")}>{item.progress}%</td>
                </tr>
              ))}
            </tbody>
          </TableCard>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-[14px] border border-line bg-white p-5">
        <h3 className="text-[17px] font-extrabold text-ink">Enroll people</h3>
        {!template ? (
          <p className="text-sm text-muted">Only programs you can see the outline of can take new people.</p>
        ) : available.length === 0 ? (
          <p className="text-sm text-muted">Everyone you can enroll is already on this program.</p>
        ) : (
          <>
            <ul className="flex max-h-[320px] flex-col overflow-y-auto rounded-[10px] border border-line">
              {available.map((person) => (
                <li className="border-b border-divider px-3 py-2.5 last:border-b-0" key={person.id}>
                  <label className="flex cursor-pointer items-center gap-3">
                    <Checkbox
                      checked={selected.has(person.id)}
                      label={`Enroll ${person.fullName}`}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setSelected((current) => {
                          const next = new Set(current);
                          if (checked) next.add(person.id);
                          else next.delete(person.id);
                          return next;
                        });
                      }}
                    />
                    <span className="flex flex-col">
                      <span className="text-sm font-bold text-ink">{person.fullName}</span>
                      <span className="text-[12px] text-muted">{person.level}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <label className="flex flex-col gap-1.5 text-sm font-bold text-ink">
              Start date
              <input
                className="rounded-[10px] border border-line-strong bg-white px-3.5 py-2.5 text-[15px] font-medium text-ink"
                onChange={(event) => setStartDate(event.target.value)}
                type="date"
                value={startDate}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-bold text-ink">
              Mentor (optional)
              <select
                className="rounded-[10px] border border-line-strong bg-white px-3.5 py-2.5 text-[15px] font-medium text-ink"
                onChange={(event) => setMentorId(event.target.value)}
                value={mentorId}
              >
                <option value="">No mentor</option>
                {mentors.map((mentor) => (
                  <option key={mentor.id} value={mentor.id}>
                    {mentor.fullName}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="btn-primary self-start"
              disabled={saving || selected.size === 0}
              onClick={() => void enroll()}
              type="button"
            >
              {saving ? "Enrolling…" : selected.size > 0 ? `Enroll ${selected.size}` : "Enroll"}
            </button>
          </>
        )}
      </section>
    </div>
  );
}

function Schedule({ enrollments }: { enrollments: EnrollmentSummary[] }) {
  const today = todayIso();
  const weeks = Array.from({ length: PROGRAM_WEEKS }, (_, index) => index + 1);

  if (enrollments.length === 0) {
    return <p className="text-sm text-muted">The schedule fills in once people are enrolled.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-2">
          Steps due each week of the program. The outlined week is where each person is today.
        </p>
        <span className="flex flex-wrap items-center gap-4">
          <StatusPill tone="success">Done</StatusPill>
          <StatusPill tone="danger">Overdue</StatusPill>
          <StatusPill tone="neutral">Coming up</StatusPill>
          <Link className="link text-sm" href="/plan-calendar">
            Full calendar
          </Link>
        </span>
      </div>
      <TableCard minWidth={980}>
        <thead>
          <tr>
            <th className={thCls} scope="col">
              SE
            </th>
            {weeks.map((week) => (
              <th className={cn(thCls, "px-1 text-center")} key={week} scope="col">
                W{week}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {enrollments.map((item) => {
            const byWeek = new Map<number, PlanStep[]>();
            for (const step of item.plan.steps) {
              const week = stepWeek(step, item.plan.startDate);
              if (week === null) continue;
              byWeek.set(week, [...(byWeek.get(week) ?? []), step]);
            }
            return (
              <tr key={item.plan.id}>
                <td className={cn(tdCls, "py-2.5 text-sm font-bold whitespace-nowrap text-ink")}>
                  {item.person?.fullName ?? "Former team member"}
                </td>
                {weeks.map((week) => {
                  const steps = byWeek.get(week) ?? [];
                  const done = steps.filter((step) => isStepValidated(step.status)).length;
                  const late = steps.filter((step) => isStepOverdue(step, today)).length;
                  const tone =
                    steps.length === 0
                      ? "bg-transparent text-faint"
                      : late > 0
                        ? "bg-danger-soft text-danger"
                        : done === steps.length
                          ? "bg-success-soft text-success"
                          : "bg-[#EEF1F7] text-ink-2";
                  return (
                    <td className={cn(tdCls, "px-1 py-2 text-center")} key={week}>
                      <span
                        className={cn(
                          "num mx-auto grid h-8 w-9 place-items-center rounded-[8px] text-[13px] font-bold",
                          tone,
                          week === item.week && "ring-2 ring-blue ring-offset-1",
                        )}
                        title={steps.map((step) => step.title).join(", ") || undefined}
                      >
                        {steps.length || "·"}
                      </span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </TableCard>
    </div>
  );
}
