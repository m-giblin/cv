"use client";

import { useRef, useState } from "react";
import type { ContentTask, DetailTab, TimelineStep } from "./types";
import { taskStatusStyle } from "./data";

export function TaskDetailPanel({
  task,
  detailTab,
  isEditing,
  onTabChange,
  onToggleEdit,
  onAssign,
  onStart,
  onPublish,
  onAddNote,
  onToggleStep,
}: {
  task: ContentTask;
  detailTab: DetailTab;
  isEditing: boolean;
  onTabChange: (tab: DetailTab) => void;
  onToggleEdit: () => void;
  onAssign: () => void;
  onStart: () => void;
  onPublish: () => void;
  onAddNote: (note: string) => void;
  onToggleStep: (steps: TimelineStep[], index: number) => void;
}) {
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const [contextDraft, setContextDraft] = useState(task.context);
  const statusSt = taskStatusStyle(task.status);

  const assignLabel = task.assigneeName ? "Reassign" : "Assign writer";
  const startLabel = task.status === "IN PROGRESS" ? "Building…" : "Start building →";

  const detailTabs: { id: DetailTab; label: string }[] = [
    { id: "brief", label: "Brief" },
    { id: "timeline", label: "Timeline" },
    { id: "activity", label: "Activity" },
  ];

  return (
    <div className="flex w-[420px] max-w-full shrink-0 flex-col overflow-hidden border-l border-[#E2DFD9] bg-white">
      <div className="relative shrink-0 bg-[#00143A] p-[14px_16px]">
        <div className="absolute left-0 right-0 top-0 h-[3px] bg-gradient-to-r from-[#CC27B0] to-[#0071CE]" />
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              {task.isAI ? (
                <div className="flex items-center gap-1 bg-[rgba(204,39,176,.3)] px-[7px] py-0.5">
                  <div className="ai-dot h-1 w-1 shrink-0 rounded-full bg-[#E87FD4]" />
                  <span className="font-mono text-[7px] tracking-widest text-[#E87FD4]">AI-GENERATED</span>
                </div>
              ) : null}
              <span className="font-mono text-[7px] tracking-wide text-white/30">
                {task.type} · {task.priority} PRIORITY
              </span>
            </div>
            <div className="font-display text-[13px] font-bold leading-snug text-white">{task.title}</div>
            <div className="mt-1 font-mono text-[7.5px] text-white/35">
              {task.requestedBy} · For {task.forSE}
            </div>
          </div>
          <span className="shrink-0 whitespace-nowrap font-mono text-[7.5px] px-2 py-[3px]" style={{ background: statusSt.bg, color: statusSt.color }}>
            {task.status}
          </span>
        </div>
        <div className="mt-2.5 flex gap-1.5">
          <button
            className="flex-1 cursor-pointer border border-white/15 bg-white/10 py-[5px] text-[8.5px] font-semibold text-white/70"
            onClick={onAssign}
            type="button"
          >
            {assignLabel}
          </button>
          <button
            className="flex-1 cursor-pointer border border-[rgba(0,113,206,.4)] bg-[rgba(0,113,206,.3)] py-[5px] text-[8.5px] font-semibold text-white"
            disabled={task.status === "IN PROGRESS"}
            onClick={onStart}
            type="button"
          >
            {startLabel}
          </button>
          <button
            className="flex-1 cursor-pointer border border-[rgba(10,110,69,.4)] bg-[rgba(10,110,69,.3)] py-[5px] text-[8.5px] font-semibold text-white"
            onClick={onPublish}
            type="button"
          >
            Publish ✓
          </button>
        </div>
      </div>

      <div className="flex shrink-0 border-b border-[#E2DFD9] bg-white">
        {detailTabs.map((dt) => (
          <button
            className="flex-1 cursor-pointer border-none bg-transparent px-1 py-2 text-[9.5px]"
            key={dt.id}
            onClick={() => onTabChange(dt.id)}
            style={{
              color: detailTab === dt.id ? "#0071CE" : "#6B6860",
              borderBottom: detailTab === dt.id ? "2px solid #0071CE" : "2px solid transparent",
              fontWeight: detailTab === dt.id ? 700 : 500,
            }}
            type="button"
          >
            {dt.label}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col gap-[11px] overflow-y-auto p-[14px_16px]">
        {detailTab === "brief" ? (
          <>
            {task.isAI && task.aiNote ? (
              <div className="flex gap-1.5 border border-[rgba(204,39,176,.15)] bg-[rgba(204,39,176,.04)] p-[9px_11px]">
                <div className="ai-dot mt-1 h-[5px] w-[5px] shrink-0 rounded-full bg-[#CC27B0]" />
                <div className="text-[10px] leading-snug text-[#6B6860]">{task.aiNote}</div>
              </div>
            ) : null}

            <div>
              <div className="mb-1 flex items-center justify-between">
                <div className="font-mono text-[7.5px] uppercase tracking-widest text-[#A09D98]">Scenario context</div>
                <button
                  className="cursor-pointer border px-2 py-0.5 text-[8px] font-semibold"
                  onClick={onToggleEdit}
                  style={{
                    background: isEditing ? "#F0FDF7" : "#F5F4F0",
                    color: isEditing ? "#0A6E45" : "#6B6860",
                    borderColor: isEditing ? "rgba(10,110,69,.3)" : "#D4D1CB",
                  }}
                  type="button"
                >
                  {isEditing ? "Save edits" : "Edit brief"}
                </button>
              </div>
              {isEditing ? (
                <textarea
                  className="h-[100px] w-full resize-y border border-[#0071CE] p-[9px_11px] text-[11px] leading-relaxed text-[#3D3C38] outline-none"
                  onChange={(e) => setContextDraft(e.target.value)}
                  value={contextDraft}
                />
              ) : (
                <div className="border border-[#EEECE8] bg-[#FAFAF8] p-[9px_11px] text-[11px] leading-relaxed text-[#3D3C38]">
                  {contextDraft}
                </div>
              )}
            </div>

            <div>
              <div className="mb-1 font-mono text-[7.5px] uppercase tracking-widest text-[#A09D98]">Success criteria</div>
              <div className="flex flex-col gap-[3px]">
                {task.criteria.map((crit) => (
                  <div className="flex items-start gap-[7px] border border-[#EEECE8] bg-[#FAFAF8] p-[6px_10px] text-[10.5px] text-[#3D3C38]" key={crit}>
                    <span className="mt-px shrink-0 font-bold text-[#0A6E45]">✓</span>
                    <span>{crit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <div className="mb-1 font-mono text-[7.5px] uppercase tracking-widest text-[#A09D98]">Competencies</div>
                <div className="flex flex-wrap gap-1">
                  {task.competencies.map((comp) => (
                    <span className="border border-[rgba(0,113,206,.12)] bg-[#F0F7FF] px-2 py-0.5 text-[9px] text-[#0071CE]" key={comp}>
                      {comp}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 font-mono text-[7.5px] uppercase tracking-widest text-[#A09D98]">Details</div>
                <div className="flex flex-col gap-[3px] text-[10px] text-[#3D3C38]">
                  <div>⏱ {task.estTime} estimated</div>
                  <div>🎯 {task.difficulty}</div>
                  <div>👤 {task.roleTarget}</div>
                </div>
              </div>
            </div>
          </>
        ) : null}

        {detailTab === "timeline" ? (
          <>
            <div className="flex flex-col gap-1">
              {task.timeline.map((tl, i) => (
                <div
                  className="flex items-center gap-2 p-[8px_10px]"
                  key={tl.label}
                  style={{
                    background: tl.done ? "#F5FDF9" : "#FAFAF8",
                    border: `1px solid ${tl.done ? "rgba(10,110,69,.12)" : "#EEECE8"}`,
                  }}
                >
                  <button
                    className="flex h-[18px] w-[18px] shrink-0 cursor-pointer items-center justify-center rounded-full"
                    onClick={() => onToggleStep(task.timeline, i)}
                    style={{
                      background: tl.done ? "#0A6E45" : "#fff",
                      border: `1px solid ${tl.done ? "#0A6E45" : "#D4D1CB"}`,
                    }}
                    type="button"
                  >
                    {tl.done ? <span className="text-[8px] text-white">✓</span> : null}
                  </button>
                  <span className="flex-1 text-[10.5px] leading-snug" style={{ color: tl.done ? "#3D3C38" : "#6B6860" }}>
                    {tl.label}
                  </span>
                  <span className="whitespace-nowrap font-mono text-[8px] text-[#A09D98]">{tl.date}</span>
                </div>
              ))}
            </div>
            <div className="border border-[rgba(10,110,69,.12)] bg-[#F5FDF9] p-2.5 text-[10px] text-[#0A6E45]">
              ✓ Click any step to mark it done. Progress auto-saves and updates the task status.
            </div>
          </>
        ) : null}

        {detailTab === "activity" ? (
          <>
            <div className="flex flex-col gap-2">
              {task.activity.map((act, i) => (
                <div className="flex gap-2 border border-[#EEECE8] bg-[#FAFAF8] p-[8px_10px]" key={`${act.time}-${i}`}>
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white"
                    style={{ background: act.avatarBg }}
                  >
                    {act.initials}
                  </div>
                  <div className="flex-1">
                    <div className="text-[10.5px] leading-snug text-[#0D0E12]">{act.note}</div>
                    <div className="mt-0.5 font-mono text-[7.5px] text-[#A09D98]">{act.time}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border border-[#E2DFD9] p-2.5">
              <div className="mb-1.5 font-mono text-[7.5px] uppercase tracking-widest text-[#A09D98]">Add note</div>
              <textarea
                className="block h-16 w-full resize-none border border-[#D4D1CB] p-[7px_9px] text-[11px] leading-snug text-[#3D3C38] outline-none"
                placeholder="Leave a note for the team…"
                ref={noteRef}
              />
              <button
                className="mt-1.5 cursor-pointer bg-[#0071CE] px-3 py-[5px] text-[9px] font-semibold text-white"
                onClick={() => {
                  const note = noteRef.current?.value.trim();
                  if (note) {
                    onAddNote(note);
                    if (noteRef.current) noteRef.current.value = "";
                  }
                }}
                type="button"
              >
                Post note
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
