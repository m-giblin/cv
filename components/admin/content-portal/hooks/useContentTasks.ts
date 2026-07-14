"use client";

import { useState } from "react";
import { mockContentTasks } from "../data";
import type { ActivityEntry, ContentTask, TaskMutations, TaskStatus, TimelineStep } from "../types";

export function useContentTasks() {
  const [tasks] = useState<ContentTask[]>(mockContentTasks);
  const [mutations, setMutations] = useState<TaskMutations>({
    taskStatus: {},
    taskAssignee: {},
    taskActivity: {},
    taskTimeline: {},
  });

  function getEffectiveTask(id: string): ContentTask {
    const base = tasks.find((t) => t.id === id)!;
    return {
      ...base,
      status: mutations.taskStatus[id] ?? base.status,
      assigneeName: mutations.taskAssignee[id] ?? base.assigneeName,
      activity: [...(mutations.taskActivity[id] ?? []), ...base.activity],
      timeline: mutations.taskTimeline[id] ?? base.timeline,
    };
  }

  function assignTask(id: string, name: string) {
    const entry: ActivityEntry = { initials: "DM", avatarBg: "#0D0E12", note: `Assigned to ${name}.`, time: "Just now" };
    setMutations((m) => ({
      ...m,
      taskStatus: { ...m.taskStatus, [id]: "ASSIGNED" },
      taskAssignee: { ...m.taskAssignee, [id]: name },
      taskActivity: { ...m.taskActivity, [id]: [entry, ...(m.taskActivity[id] ?? [])] },
    }));
  }

  function startTask(id: string) {
    setMutations((m) => ({ ...m, taskStatus: { ...m.taskStatus, [id]: "IN PROGRESS" } }));
  }

  function publishTask(id: string) {
    setMutations((m) => ({ ...m, taskStatus: { ...m.taskStatus, [id]: "COMPLETE" } }));
  }

  function addActivity(id: string, note: string) {
    const entry: ActivityEntry = { initials: "DM", avatarBg: "#0D0E12", note, time: "Just now" };
    setMutations((m) => ({
      ...m,
      taskActivity: { ...m.taskActivity, [id]: [entry, ...(m.taskActivity[id] ?? [])] },
    }));
  }

  function toggleTimelineStep(id: string, steps: TimelineStep[], index: number) {
    const updated = steps.map((s, i) => (i === index ? { ...s, done: !s.done } : s));
    setMutations((m) => ({ ...m, taskTimeline: { ...m.taskTimeline, [id]: updated } }));
  }

  return { tasks, getEffectiveTask, assignTask, startTask, publishTask, addActivity, toggleTimelineStep };
}

export type { TaskStatus };
