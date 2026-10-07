"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PeopleBreakdown, type BreakdownKind } from "@/components/programs/people-breakdown";
import { ProgramTimeline, ProgramTrackCards } from "@/components/programs/program-tracks";
import { ProgramWorkbench, type ProgramTab } from "@/components/programs/program-workbench";
import { GapBanner } from "@/components/ui/editorial";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { ScoreBar } from "@/components/ui/bars";
import { Stat, StatStrip } from "@/components/ui/stat";
import { StatusPill } from "@/components/ui/status-pill";
import { TableCard, TwoLineCell, tdCls, thCls } from "@/components/ui/table";
import type { DbTemplate } from "@/lib/admin/plan-builder";
import {
  PROGRAM_PHASES,
  PROGRAM_WEEKS,
  summarizePrograms,
  unenrolledPeople,
} from "@/lib/programs/program-model";
import type { ProgramTrack } from "@/lib/programs/tracks";
import type { Profile, UserPlan } from "@/lib/types";
import { cn } from "@/lib/utils";

const NEW = "new";
const TABS: ProgramTab[] = ["progress", "outline", "people", "schedule"];

/**
 * Programs, the same in every portal: one list of programs, each opening a full workbench.
 * Admins create programs and edit outlines; managers see their team's progress and enroll people.
 */
export function ProgramsWorkspace({
  mode,
  plans,
  people,
  mentors,
}: {
  mode: "admin" | "manager";
  plans: UserPlan[];
  /** SEs in scope: the whole tenant for admins, the manager's org for managers. */
  people: Profile[];
  mentors: Profile[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [templates, setTemplates] = useState<DbTemplate[] | null>(null);
  const canEdit = mode === "admin";

  const loadTemplates = useCallback(async () => {
    const response = await fetch("/api/plans/templates").catch(() => null);
    if (!response?.ok) {
      toast.error("Could not load programs.");
      setTemplates([]);
      return;
    }
    const body = (await response.json()) as { templates?: DbTemplate[] } | DbTemplate[];
    const list = Array.isArray(body) ? body : (body.templates ?? []);
    setTemplates([...list].sort((a, b) => a.name.localeCompare(b.name)));
  }, []);

  const [tracks, setTracks] = useState<ProgramTrack[]>([]);
  const [breakdown, setBreakdown] = useState<BreakdownKind | null>(null);
  const loadTracks = useCallback(async () => {
    const response = await fetch("/api/programs/tracks").catch(() => null);
    const body = response?.ok ? ((await response.json()) as { tracks?: ProgramTrack[] }) : null;
    setTracks(body?.tracks ?? []);
  }, []);

  useEffect(() => {
    void loadTemplates();
    void loadTracks();
  }, [loadTemplates, loadTracks]);

  const scopedPlans = useMemo(() => {
    const ids = new Set(people.map((person) => person.id));
    return plans.filter((plan) => ids.has(plan.userId));
  }, [people, plans]);

  const programs = useMemo(
    () => (templates ? summarizePrograms(templates, scopedPlans, people) : []),
    [people, scopedPlans, templates],
  );
  // Plans that are stages of a program show on its timeline, not again in the plan table.
  const stagePlanIds = useMemo(() => new Set(tracks.flatMap((track) => track.stages.map((stage) => stage.planId))), [tracks]);
  const otherPlans = useMemo(() => programs.filter((program) => !stagePlanIds.has(program.id)), [programs, stagePlanIds]);
  const openTrack = tracks.find((track) => track.id === searchParams.get("track")) ?? null;
  const setTrack = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("track", id);
      else params.delete("track");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );
  const unenrolled = useMemo(() => unenrolledPeople(people, scopedPlans), [people, scopedPlans]);

  const openId = searchParams.get("program");
  const tabParam = searchParams.get("tab");
  const addingPractice = canEdit && Boolean(searchParams.get("addPractice"));
  const focusStepId = canEdit ? searchParams.get("step") : null;
  const addingStep = canEdit && searchParams.get("addStep") === "1";
  const openProgram = programs.find((program) => program.id === openId) ?? null;
  const openTemplate = templates?.find((template) => template.id === openId) ?? null;

  const setOpen = useCallback(
    (id: string | null, tab?: ProgramTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("addPractice");
      params.delete("title");
      params.delete("track");
      params.delete("step");
      params.delete("addStep");
      if (id) params.set("program", id);
      else params.delete("program");
      if (tab) params.set("tab", tab);
      else params.delete("tab");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // "Add to a ramp plan" from the practice library lands here; open the first program's editor.
  useEffect(() => {
    if (!addingPractice || openId || !templates?.length) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("program", templates[0]!.id);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [addingPractice, openId, pathname, router, searchParams, templates]);

  const refresh = useCallback(() => {
    void loadTemplates();
    void loadTracks();
    router.refresh();
  }, [loadTemplates, loadTracks, router]);

  const enrolledCount = new Set(scopedPlans.filter((plan) => plan.status !== "completed").map((plan) => plan.userId)).size;
  // People, not enrollments: one SE can be on several programs.
  const atRisk = new Set(
    programs.flatMap((program) =>
      program.enrollments.filter((item) => item.health === "at_risk").map((item) => item.plan.userId),
    ),
  ).size;
  const progressValues = programs.flatMap((program) => program.enrollments.map((item) => item.progress));
  const avgProgress = progressValues.length
    ? Math.round(progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length)
    : null;
  const loading = templates === null;

  return (
    <>
      <PageHeader
        accent="Every ramp in one place."
        actions={
          canEdit ? (
            <button className="btn-primary whitespace-nowrap" onClick={() => setOpen(NEW)} type="button">
              New program
            </button>
          ) : null
        }
        eyebrow="Programs"
        subtitle="A program is a set of stages, each a plan of steps. Open a program to see its timeline and who's where."
        title="Programs."
      />
      <PageBody className="flex flex-col gap-6">
        <StatStrip>
          {/* Programs are the tracks; plans that are their stages aren't counted again. */}
          <Stat
            label="Programs"
            note={tracks.length && otherPlans.length ? `plus ${otherPlans.length} other plan${otherPlans.length === 1 ? "" : "s"}` : undefined}
            value={loading ? "—" : tracks.length || programs.length}
          />
          <Stat
            label={mode === "manager" ? "Your SEs enrolled" : "SEs enrolled"}
            note={`of ${people.length}`}
            onClick={() => setBreakdown("enrolled")}
            value={enrolledCount}
          />
          <Stat label="SEs at risk" note="overdue work" onClick={() => setBreakdown("at_risk")} tone={atRisk > 0 ? "danger" : "blue"} value={atRisk} />
          <Stat label="Avg completion" onClick={() => setBreakdown("completion")} value={avgProgress === null ? "—" : `${avgProgress}%`} />
        </StatStrip>

        {!loading && unenrolled.length > 0 && programs.length > 0 ? (
          <GapBanner
            action={
              <span className="flex flex-wrap gap-2">
                <button className="btn-secondary" onClick={() => setBreakdown("unenrolled")} type="button">
                  See who
                </button>
                <button className="btn-primary" onClick={() => setOpen(programs[0]!.id, "people")} type="button">
                  Enroll them
                </button>
              </span>
            }
            of={people.length}
            title={`${unenrolled.length === 1 ? "SE has" : "SEs have"} no program`}
            value={unenrolled.length}
          >
            {unenrolled
              .slice(0, 4)
              .map((person) => person.fullName)
              .join(", ")}
            {unenrolled.length > 4 ? ` and ${unenrolled.length - 4} more` : ""}. Open a program&apos;s People tab to enroll.
          </GapBanner>
        ) : null}

        <ProgramTrackCards onOpen={(id) => setTrack(id)} summaries={programs} tracks={tracks} />

        {tracks.length && otherPlans.length ? <h2 className="label-caps pt-2">Other plans</h2> : null}

        {loading ? (
          <p className="py-10 text-center text-sm text-muted" role="status">
            Loading programs…
          </p>
        ) : otherPlans.length === 0 && tracks.length ? null : programs.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-[14px] border border-dashed border-line-strong bg-white px-6 py-8">
            <p className="text-[15px] font-bold text-ink">No programs yet.</p>
            <p className="text-sm text-ink-2">
              {canEdit ? "Create the first program, then enroll SEs in it." : "Your enablement admin hasn't published a program yet."}
            </p>
            {canEdit ? (
              <button className="btn-primary" onClick={() => setOpen(NEW)} type="button">
                New program
              </button>
            ) : null}
          </div>
        ) : (
          <TableCard minWidth={860}>
            <caption className="sr-only">Programs. Open a row to work on it.</caption>
            <thead>
              <tr>
                <th className={cn(thCls, "w-[44%]")} scope="col">
                  Program
                </th>
                <th className={thCls} scope="col">
                  Steps
                </th>
                <th className={cn(thCls, "text-right")} scope="col">
                  People
                </th>
                <th className={cn(thCls, "w-[200px]")} scope="col">
                  Avg completion
                </th>
                <th className={cn(thCls, "text-right")} scope="col">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {(tracks.length ? otherPlans : programs).map((program) => (
                <tr
                  className={cn("cursor-pointer hover:bg-[#FBF9F5]", program.atRisk > 0 && "bg-danger-row")}
                  key={program.id}
                  onClick={() => setOpen(program.id)}
                >
                  <td className={cn(tdCls, "max-w-0 py-3.5")}>
                    <button
                      aria-label={`Open ${program.name}`}
                      className="group block w-full text-left"
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpen(program.id);
                      }}
                      type="button"
                    >
                      <TwoLineCell
                        subline={program.description || `${program.stepCount} steps over ${PROGRAM_WEEKS} weeks`}
                        title={
                          <span className="decoration-blue decoration-2 underline-offset-4 group-hover:text-blue group-hover:underline">
                            {program.name}
                          </span>
                        }
                      />
                    </button>
                  </td>
                  <td className={tdCls}>
                    <span aria-label={PROGRAM_PHASES.map((phase, index) => `${phase.name} ${program.stepsPerPhase[index] ?? 0}`).join(", ")} className="flex items-end gap-1">
                      {PROGRAM_PHASES.map((phase, index) => {
                        const count = program.stepsPerPhase[index] ?? 0;
                        return (
                          <span className="flex flex-col items-center gap-1" key={phase.index} title={`${phase.name}: ${count} steps`}>
                            <span className="num text-[12px] font-bold text-ink-2">{count}</span>
                            <span className={cn("h-1.5 w-10 rounded-full", count ? "bg-blue" : "bg-track")} />
                          </span>
                        );
                      })}
                    </span>
                  </td>
                  <td className={cn(tdCls, "num text-right text-[15px] font-bold text-ink")}>{program.enrollments.length}</td>
                  <td className={tdCls}>
                    {program.avgProgress === null ? (
                      <span className="text-sm text-muted">Nobody enrolled</span>
                    ) : (
                      <span className="flex items-center gap-3">
                        <span className="num w-10 text-sm font-bold text-ink">{program.avgProgress}%</span>
                        <ScoreBar className="flex-1" target={100} value={program.avgProgress} />
                      </span>
                    )}
                  </td>
                  <td className={cn(tdCls, "text-right")}>
                    {program.atRisk > 0 ? (
                      <StatusPill tone="danger">{program.atRisk} at risk</StatusPill>
                    ) : program.enrollments.length > 0 ? (
                      <StatusPill tone="success">On track</StatusPill>
                    ) : (
                      <StatusPill tone="neutral">Ready</StatusPill>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableCard>
        )}
      </PageBody>

      {breakdown ? (
        <PeopleBreakdown kind={breakdown} onClose={() => setBreakdown(null)} programs={programs} tracks={tracks} unenrolled={unenrolled} />
      ) : null}

      {openTrack ? (
        <ProgramTimeline
          canEdit={canEdit}
          onClose={() => setTrack(null)}
          onAddStep={(planId) => {
            setOpen(planId, "outline");
            const params = new URLSearchParams({ program: planId, tab: "outline", addStep: "1" });
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
          }}
          onEditStage={(planId) => setOpen(planId, "outline")}
          onEditStep={(planId, stepId) => {
            const params = new URLSearchParams({ program: planId, tab: "outline", step: stepId });
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
          }}
          summaries={programs}
          track={openTrack}
        />
      ) : null}

      {openId && !loading && (openId === NEW ? canEdit : openProgram || openTemplate) ? (
        <ProgramWorkbench
          candidates={people}
          canEdit={canEdit}
          initialTab={TABS.includes(tabParam as ProgramTab) ? (tabParam as ProgramTab) : "progress"}
          isNew={openId === NEW}
          key={openId}
          mentors={mentors}
          onChanged={refresh}
          onClose={() => setOpen(null)}
          onCreated={(id) => setOpen(id, "people")}
          program={openProgram}
          addStep={addingStep}
          focusStepId={focusStepId}
          startEditing={addingPractice || Boolean(focusStepId) || addingStep}
          template={openTemplate}
        />
      ) : null}
    </>
  );
}
