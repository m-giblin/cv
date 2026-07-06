"use client";

import { Loader2, Rocket, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

type AssigneeRow = Profile & { alreadyEnrolled: boolean };

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
      toast.error("Assignment failed — link a plan template to the course first.");
      return;
    }
    const body = (await response.json()) as { assigned: number; skipped: number };
    toast.success(`Assigned ${body.assigned} SE${body.assigned === 1 ? "" : "s"}${body.skipped ? ` · ${body.skipped} already enrolled` : ""}.`);
    setAssignCourseId(null);
    void load();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-[#0071ce]" />
          Release training engine
        </CardTitle>
        <CardDescription>
          Package a plan template as a just-in-time release course and assign it to selected team members.
        </CardDescription>
      </CardHeader>
      <div className="space-y-6 px-6 pb-6">
        <form className="space-y-3" onSubmit={createCourse}>
          <Input onChange={(e) => setName(e.target.value)} placeholder="Course name (e.g. AIS Q3 Release)" required value={name} />
          <Textarea onChange={(e) => setDescription(e.target.value)} placeholder="Description" value={description} />
          <Input onChange={(e) => setProjectTag(e.target.value)} placeholder="Project tag" required value={projectTag} />
          <Input onChange={(e) => setLabMode(e.target.value)} placeholder="ISC Lab mode (e.g. battlecard, pre_call_brief)" value={labMode} />
          <Input onChange={(e) => setPitchTopic(e.target.value)} placeholder="Pitch topic (optional)" value={pitchTopic} />
          <Input onChange={(e) => setSlackChannel(e.target.value)} placeholder="Slack announce channel (optional)" value={slackChannel} />
          <select
            className="h-10 w-full rounded-xl border border-stone-200 px-3 text-sm"
            onChange={(e) => setPlanId(e.target.value)}
            value={planId}
          >
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          <Button type="submit">Create release course</Button>
        </form>

        {loading ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-stone-400" />
        ) : (
          <ul className="space-y-2">
            {courses.map((course) => (
              <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 p-3 text-sm" key={course.id}>
                <div>
                  <p className="font-semibold">{course.name}</p>
                  <p className="text-stone-500">
                    {course.project_tag}
                    {course.plan_id ? ` · plan linked` : " · no plan linked"}
                    {course.enrolled_user_ids?.length
                      ? ` · ${course.enrolled_user_ids.length} enrolled`
                      : ""}
                  </p>
                </div>
                <Button
                  disabled={!course.plan_id}
                  onClick={() => setAssignCourseId(course.id)}
                  size="sm"
                  type="button"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Assign
                </Button>
              </li>
            ))}
          </ul>
        )}

        {assignCourse ? (
          <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-4">
            <p className="font-semibold text-stone-800">Assign: {assignCourse.name}</p>
            <p className="mt-1 text-xs text-stone-500">SEs with an active assignment of this plan are shown as already enrolled.</p>
            <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
              {eligibleAssignees.map((person) => (
                <li className="flex items-center gap-2 text-sm" key={person.id}>
                  <input
                    checked={selectedUserIds.has(person.id)}
                    disabled={person.alreadyEnrolled}
                    onChange={() => toggleUser(person.id)}
                    type="checkbox"
                  />
                  <span className={person.alreadyEnrolled ? "text-stone-400" : "text-stone-800"}>
                    {person.fullName}
                    {person.alreadyEnrolled ? " (already enrolled)" : ""}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <Button onClick={() => void assignSelected()} size="sm" type="button">
                Assign selected ({selectedUserIds.size})
              </Button>
              <Button onClick={() => setAssignCourseId(null)} size="sm" type="button" variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
