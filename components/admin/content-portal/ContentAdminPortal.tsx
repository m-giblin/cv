"use client";

import { useCallback, useState } from "react";
import { AssignWriterModal } from "./AssignWriterModal";
import { mockWriters } from "./data";
import { useContentTasks } from "./hooks/useContentTasks";
import { NewTaskModal } from "./NewTaskModal";
import { TaskDetailPanel } from "./TaskDetailPanel";
import { TaskTable } from "./TaskTable";
import type { DetailTab, FilterTab, Writer } from "./types";

export function ContentAdminPortal() {
  const { tasks, getEffectiveTask, assignTask, startTask, publishTask, addActivity, toggleTimelineStep } = useContentTasks();
  const [selectedId, setSelectedId] = useState(tasks[0]?.id ?? "");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [detailTab, setDetailTab] = useState<DetailTab>("brief");
  const [isEditing, setIsEditing] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [newTaskModal, setNewTaskModal] = useState(false);
  const [toast, setToast] = useState<{ msg: string; color: string } | null>(null);

  const showToast = useCallback((msg: string, color = "#0071CE") => {
    setToast({ msg, color });
    window.setTimeout(() => setToast(null), 3000);
  }, []);

  const filterMap: Record<FilterTab, typeof tasks> = {
    all: tasks,
    ai: tasks.filter((t) => t.isAI),
    new: tasks.filter((t) => getEffectiveTask(t.id).status === "NEW"),
    progress: tasks.filter((t) => ["IN PROGRESS", "ASSIGNED"].includes(getEffectiveTask(t.id).status)),
    complete: tasks.filter((t) => getEffectiveTask(t.id).status === "COMPLETE"),
  };
  const filtered = filterMap[filter];
  const selected = selectedId ? getEffectiveTask(selectedId) : null;

  function handleAssign(writer: Writer) {
    assignTask(selectedId, writer.name);
    setAssignModal(false);
    showToast(`${writer.name} assigned — they've been notified`, "#0A6E45");
  }

  function handlePublish() {
    publishTask(selectedId);
    showToast("Published! Manager notified — scenario now live in library", "#0A6E45");
  }

  function handleExportQueue() {
    const rows = tasks.map((t) => {
      const e = getEffectiveTask(t.id);
      return [e.title, e.type, e.priority, e.status, e.assigneeName ?? "", e.due].join(",");
    });
    const csv = ["Title,Type,Priority,Status,Assignee,Due", ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "content-queue.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    showToast("Queue exported as CSV", "#0071CE");
  }

  return (
    <div className="flex flex-col overflow-hidden border border-[#E2DFD9] bg-[#F5F4F0]">
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-[#E2DFD9] bg-white px-5">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10.5px] text-[#3D3C38]">Admin › Content Portal</span>
          <div className="flex items-center gap-1.5 border border-[rgba(204,39,176,.15)] bg-[rgba(204,39,176,.06)] px-[9px] py-[3px]">
            <div className="ai-dot h-[5px] w-[5px] shrink-0 rounded-full bg-[#CC27B0]" />
            <span className="font-mono text-[7.5px] tracking-widest text-[#CC27B0]">AI TASK ENGINE</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="cursor-pointer border border-[#D4D1CB] bg-[#F5F4F0] px-3 py-[5px] text-[9.5px] font-semibold text-[#3D3C38]"
            onClick={handleExportQueue}
            type="button"
          >
            Export queue
          </button>
          <button
            className="cursor-pointer bg-[#0071CE] px-3 py-[5px] text-[9.5px] font-semibold text-white"
            onClick={() => setNewTaskModal(true)}
            type="button"
          >
            + New content task
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden max-lg:flex-col">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <TaskTable
            allTasks={tasks}
            filter={filter}
            getEffectiveTask={getEffectiveTask}
            onFilterChange={setFilter}
            onSelect={(id) => {
              setSelectedId(id);
              setDetailTab("brief");
              setIsEditing(false);
            }}
            selectedId={selectedId}
            tasks={filtered}
          />
        </div>
        {selected ? (
          <TaskDetailPanel
            detailTab={detailTab}
            isEditing={isEditing}
            onAddNote={(note) => {
              addActivity(selected.id, note);
              showToast("Note added", "#0071CE");
            }}
            onAssign={() => setAssignModal(true)}
            onPublish={handlePublish}
            onStart={() => {
              startTask(selected.id);
              showToast("Task moved to In Progress", "#0071CE");
            }}
            onTabChange={setDetailTab}
            onToggleEdit={() => {
              if (isEditing) showToast("Brief updated", "#0A6E45");
              setIsEditing((e) => !e);
            }}
            onToggleStep={(steps, i) => toggleTimelineStep(selected.id, steps, i)}
            task={selected}
          />
        ) : null}
      </div>

      {assignModal ? (
        <AssignWriterModal onAssign={handleAssign} onClose={() => setAssignModal(false)} writers={mockWriters} />
      ) : null}

      {newTaskModal ? (
        <NewTaskModal
          onClose={() => setNewTaskModal(false)}
          onCreate={() => {
            setNewTaskModal(false);
            showToast("Task created successfully", "#0071CE");
          }}
        />
      ) : null}

      {toast ? (
        <div
          className="pointer-events-none fixed bottom-7 left-1/2 z-[1000] -translate-x-1/2 whitespace-nowrap px-5 py-2.5 text-xs font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,.25)]"
          style={{ background: toast.color }}
        >
          {toast.msg}
        </div>
      ) : null}
    </div>
  );
}
