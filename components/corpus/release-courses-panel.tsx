"use client";

import { Loader2, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  EmptyState,
  Field,
  LineCard,
  LineRow,
  LinkButton,
  LoadingState,
  Meta,
  SecondaryButton,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/admin/admin-ui";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusPill } from "@/components/ui/status-pill";
import { rowHighlight } from "@/components/ui/table";
import { Tag } from "@/components/ui/tag";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

type Course = {
  id: string;
  name: string;
  description: string | null;
  project_tag: string;
  plan_id: string | null;
  enrolled_user_ids?: string[];
};

type PlanTemplate = { id: string; name: string };

type AssigneeRow = Profile & { alreadyEnrolled: boolean };

export function ReleaseCoursesPanel({
  assignees,
}: {
  assignees: Profile[];
}) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectTag, setProjectTag] = useState("");
  const [planId, setPlanId] = useState("");
  const [labMode, setLabMode] = useState("coaching");
  const [pitchTopic, setPitchTopic] = useState("");
  const [slackChannel, setSlackChannel] = useState("");
  const [assignCourseId, setAssignCourseId] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [courseRes, templateRes] = await Promise.all([
      fetch("/api/release-courses"),
      fetch("/api/plans/templates"),
    ]);
    if (courseRes.ok) {
      const body = (await courseRes.json()) as { courses: Course[] };
      setCourses(body.courses ?? []);
    }
    if (templateRes.ok) {
      const body = (await templateRes.json()) as { templates: PlanTemplate[] };
      setTemplates(body.templates ?? []);
      if (body.templates[0]) setPlanId(body.templates[0].id);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const assignCourse = useMemo(
    () => courses.find((course) => course.id === assignCourseId) ?? null,
    [assignCourseId, courses],
  );

  const eligibleAssignees = useMemo((): AssigneeRow[] => {
    if (!assignCourse) {
      return assignees.map((person) => ({ ...person, alreadyEnrolled: false }));
    }
    const enrolled = new Set(assignCourse.enrolled_user_ids ?? []);
    return assignees.map((person) => ({
      ...person,
      alreadyEnrolled: enrolled.has(person.id),
    }));
  }, [assignCourse, assignees]);

  useEffect(() => {
    if (!assignCourse) {
      setSelectedUserIds(new Set());
      return;
    }
    const defaults = assignees
      .filter((person) => !(assignCourse.enrolled_user_ids ?? []).includes(person.id))
      .map((person) => person.id);
    setSelectedUserIds(new Set(defaults));
  }, [assignCourse, assignees]);

  async function createCourse(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    const response = await fetch("/api/release-courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        projectTag,
        planId: planId || undefined,
        labMode: labMode || undefined,
        pitchTopic: pitchTopic || undefined,
        slackAnnounceChannel: slackChannel || undefined,
        corpusTagFilters: projectTag ? [projectTag] : [],
      }),
    });
    setCreating(false);
    if (!response.ok) {
      toast.error("Could not create release course.");
      return;
    }
    toast.success("Release course created.");
    setName("");
    setDescription("");
    setProjectTag("");
    void load();
  }

  function toggleUser(userId: string) {
    setSelectedUserIds((current) => {
      const next = new Set(current);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

  async function assignSelected() {
    if (!assignCourseId) return;

    const userIds = [...selectedUserIds];
    if (userIds.length === 0) {
      toast.error("Select at least one SE to assign.");
      return;
    }

    const startDate = new Date().toISOString().slice(0, 10);
    const response = await fetch("/api/release-courses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId: assignCourseId,
        assign: { userIds, startDate },
      }),
    });
    if (!response.ok) {
      toast.error("Assignment failed. Link a plan template to the course first.");
      return;
    }
    const body = (await response.json()) as { assigned: number; skipped: number };
    toast.success(
      `Assigned ${body.assigned} SE${body.assigned === 1 ? "" : "s"}.${body.skipped ? ` ${body.skipped} ${body.skipped === 1 ? "was" : "were"} already enrolled.` : ""}`,
    );
    setAssignCourseId(null);
    void load();
  }

  return (
    <div className="flex flex-col gap-6">
      <LineCard meta="Turn a plan template into a release course" title="Release training">
        <p className="mb-4 text-sm leading-[1.5] text-ink-2">
          Package a plan template as a just-in-time release course and assign it to selected team members.
        </p>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={createCourse}>
          <Field htmlFor="release-course-name" label="Course name">
            <TextInput
              id="release-course-name"
              onChange={(e) => setName(e.target.value)}
              placeholder="For example, AIS Q3 release"
              required
              value={name}
            />
          </Field>
          <Field htmlFor="release-course-tag" label="Project tag">
            <TextInput
              id="release-course-tag"
              onChange={(e) => setProjectTag(e.target.value)}
              required
              value={projectTag}
            />
          </Field>
          <Field className="md:col-span-2" htmlFor="release-course-description" label="Description">
            <TextArea
              id="release-course-description"
              onChange={(e) => setDescription(e.target.value)}
              value={description}
            />
          </Field>
          <Field htmlFor="release-course-plan" label="Plan template">
            <SelectInput
              disabled={templates.length === 0}
              id="release-course-plan"
              onChange={(e) => setPlanId(e.target.value)}
              value={planId}
            >
              {templates.length === 0 ? <option value="">No templates available</option> : null}
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field htmlFor="release-course-lab-mode" hint="For example, battlecard or pre_call_brief." label="Lab mode">
            <TextInput id="release-course-lab-mode" onChange={(e) => setLabMode(e.target.value)} value={labMode} />
          </Field>
          <Field htmlFor="release-course-pitch" label="Pitch topic (optional)">
            <TextInput id="release-course-pitch" onChange={(e) => setPitchTopic(e.target.value)} value={pitchTopic} />
          </Field>
          <Field htmlFor="release-course-slack" label="Slack announce channel (optional)">
            <TextInput
              id="release-course-slack"
              onChange={(e) => setSlackChannel(e.target.value)}
              placeholder="#channel"
              value={slackChannel}
            />
          </Field>
          <div className="md:col-span-2">
            <SecondaryButton disabled={creating} type="submit">
              {creating ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
              Create release course
            </SecondaryButton>
          </div>
        </form>
      </LineCard>

      <LineCard bodyClassName="p-0" meta={loading ? undefined : `${courses.length} in total`} title="Release courses">
        {loading ? (
          <LoadingState label="Loading courses…" />
        ) : courses.length === 0 ? (
          <EmptyState>No release courses yet.</EmptyState>
        ) : (
          courses.map((course) => {
            const selected = course.id === assignCourseId;
            return (
              <LineRow
                className={cn("flex flex-wrap items-center justify-between gap-3", selected && rowHighlight.selected)}
                key={course.id}
              >
                <div className="min-w-0">
                  <p className="text-[15px] font-bold text-ink">{course.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Tag tone="blue">{course.project_tag}</Tag>
                    <StatusPill tone={course.plan_id ? "success" : "warning"}>
                      {course.plan_id ? "Plan linked" : "No plan linked"}
                    </StatusPill>
                    {course.enrolled_user_ids?.length ? (
                      <Meta className="text-muted">{course.enrolled_user_ids.length} enrolled</Meta>
                    ) : null}
                  </div>
                </div>
                <SecondaryButton
                  aria-label={`Assign ${course.name}`}
                  aria-pressed={selected}
                  disabled={!course.plan_id}
                  onClick={() => setAssignCourseId(course.id)}
                >
                  <Users aria-hidden className="h-4 w-4" />
                  Assign
                </SecondaryButton>
              </LineRow>
            );
          })
        )}
      </LineCard>

      {assignCourse ? (
        <LineCard meta={`${selectedUserIds.size} selected`} title={`Assign: ${assignCourse.name}`}>
          <p className="text-[13px] text-muted">
            SEs with an active assignment of this plan are shown as already enrolled.
          </p>
          {eligibleAssignees.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No team members to assign.</p>
          ) : (
            <ul className="mt-3 flex max-h-56 flex-col overflow-y-auto rounded-[10px] border border-line">
              {eligibleAssignees.map((person) => {
                const checkboxId = `release-assign-${assignCourse.id}-${person.id}`;
                return (
                  <li className="border-b border-divider last:border-b-0" key={person.id}>
                    <label
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 text-[15px]",
                        person.alreadyEnrolled ? "text-muted" : "cursor-pointer text-ink hover:bg-bg",
                      )}
                      htmlFor={checkboxId}
                    >
                      <Checkbox
                        checked={selectedUserIds.has(person.id)}
                        disabled={person.alreadyEnrolled}
                        id={checkboxId}
                        onChange={() => toggleUser(person.id)}
                      />
                      <span className="min-w-0 flex-1 truncate">{person.fullName}</span>
                      {person.alreadyEnrolled ? <span className="text-[13px] text-muted">Already enrolled</span> : null}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <SecondaryButton onClick={() => void assignSelected()}>
              Assign selected ({selectedUserIds.size})
            </SecondaryButton>
            <LinkButton onClick={() => setAssignCourseId(null)}>Cancel</LinkButton>
          </div>
        </LineCard>
      ) : null}
    </div>
  );
}
