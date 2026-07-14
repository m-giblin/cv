"use client";

import type { GoalCard as GoalCardType } from "./types";
import { goalProgressColor, goalTagStyle } from "./utils/goalBuilder";

export function GoalCard({
  goal,
  onSubmitContent,
}: {
  goal: GoalCardType;
  onSubmitContent: (title: string) => void;
}) {
  const tagStyle = goalTagStyle(goal.tag);
  const progressColor = goalProgressColor(goal.progress);

  return (
    <div
      className="relative min-w-[220px] flex-1 p-[12px_14px]"
      style={{ border: `1px solid ${goal.isNewContent ? "rgba(204,39,176,.15)" : "#EEECE8"}`, background: "#FAFAF8" }}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-[7px]">
          <span className="text-base">{goal.icon}</span>
          <div>
            <div className="text-[11.5px] font-semibold leading-snug text-[#0D0E12]">{goal.title}</div>
            <div className="mt-px font-mono text-[7.5px] tracking-wide text-[#A09D98]">
              {goal.quarter} · {goal.source}
            </div>
          </div>
        </div>
        <span
          className="shrink-0 whitespace-nowrap font-mono text-[7.5px] font-medium tracking-wide px-[7px] py-[2px]"
          style={{ background: tagStyle.bg, color: tagStyle.color }}
        >
          {goal.tag}
        </span>
      </div>

      <div className="mb-1.5 h-[3px] bg-[#EEECE8]">
        <div className="h-[3px] transition-[width] duration-500" style={{ width: `${goal.progress}%`, background: progressColor }} />
      </div>
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[8px] text-[#6B6860]">{goal.progress}% complete</span>
        <span className="font-mono text-[8px]" style={{ color: goal.overdue ? "#B83128" : "#6B6860" }}>
          Due {goal.dueDate}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        {goal.milestones.map((ms) => (
          <div className="flex items-center gap-1.5" key={`${ms.label}-${ms.date}`}>
            <div
              className="flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full"
              style={{
                background: ms.done ? "#0A6E45" : "#fff",
                border: `1px solid ${ms.done ? "#0A6E45" : "#D4D1CB"}`,
              }}
            >
              {ms.done ? <span className="text-[7px] text-white">✓</span> : null}
            </div>
            <span className="flex-1 text-[10px] leading-snug" style={{ color: ms.done ? "#0A6E45" : "#3D3C38" }}>
              {ms.label}
            </span>
            <span className="font-mono text-[7.5px]" style={{ color: ms.done ? "#A09D98" : "#6B6860" }}>
              {ms.date}
            </span>
            {ms.isCalendar ? (
              <span className="text-[8px]" title="On Plan Calendar">
                📅
              </span>
            ) : null}
          </div>
        ))}
      </div>

      {goal.isNewContent ? (
        <div className="mt-2.5 border border-dashed border-[rgba(204,39,176,.25)] bg-[rgba(204,39,176,.04)] p-[8px_10px]">
          <div className="mb-1 flex items-center gap-1.5">
            <div className="ai-dot h-[5px] w-[5px] shrink-0 rounded-full bg-[#CC27B0]" />
            <span className="font-mono text-[7.5px] tracking-widest text-[#CC27B0]">AI-GENERATED CHALLENGE</span>
          </div>
          <div className="text-[10px] leading-snug text-[#6B6860]">{goal.newContentNote}</div>
          <button
            className="mt-1.5 cursor-pointer border border-[rgba(204,39,176,.2)] bg-[rgba(204,39,176,.1)] px-2 py-[3px] text-[8.5px] font-semibold text-[#CC27B0]"
            onClick={() => onSubmitContent(goal.title)}
            type="button"
          >
            Approve &amp; add to content library
          </button>
        </div>
      ) : null}
    </div>
  );
}
