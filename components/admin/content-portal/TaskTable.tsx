"use client";

import type { ContentTask, FilterTab } from "./types";
import { taskPriorityStyle, taskStatusStyle, taskTypeStyle } from "./data";

export function TaskTable({
  tasks,
  allTasks,
  selectedId,
  filter,
  onSelect,
  onFilterChange,
  getEffectiveTask,
}: {
  tasks: ContentTask[];
  allTasks: ContentTask[];
  selectedId: string;
  filter: FilterTab;
  onSelect: (id: string) => void;
  onFilterChange: (filter: FilterTab) => void;
  getEffectiveTask: (id: string) => ContentTask;
}) {
  const counts = {
    ai: allTasks.filter((t) => t.isAI).length,
    new: allTasks.filter((t) => getEffectiveTask(t.id).status === "NEW").length,
    progress: allTasks.filter((t) => ["IN PROGRESS", "ASSIGNED"].includes(getEffectiveTask(t.id).status)).length,
    complete: allTasks.filter((t) => getEffectiveTask(t.id).status === "COMPLETE").length,
  };

  const summaryCards = [
    {
      label: "Open tasks",
      value: String(allTasks.filter((t) => getEffectiveTask(t.id).status !== "COMPLETE").length),
      sub: `${counts.ai} AI-generated`,
      color: "#0D0E12",
    },
    { label: "AI-generated", value: String(counts.ai), sub: "Pending review", color: "#CC27B0" },
    { label: "In progress", value: String(counts.progress), sub: "Being built", color: "#0071CE" },
    { label: "Due this week", value: "4", sub: "1 overdue", color: "#D4810A" },
    { label: "Published this month", value: "11", sub: "Avg 3.2 days", color: "#0A6E45" },
  ];

  const filterTabs: { id: FilterTab; label: string; color: string }[] = [
    { id: "all", label: `All (${allTasks.length})`, color: "#0071CE" },
    { id: "ai", label: `AI-generated (${counts.ai})`, color: "#CC27B0" },
    { id: "new", label: `New (${counts.new})`, color: "#0D0E12" },
    { id: "progress", label: `In progress (${counts.progress})`, color: "#0D0E12" },
    { id: "complete", label: `Complete (${counts.complete})`, color: "#0A6E45" },
  ];

  return (
    <>
      <div className="grid shrink-0 grid-cols-2 gap-px border-b border-[#E2DFD9] bg-[#E2DFD9] sm:grid-cols-3 lg:grid-cols-5">
        {summaryCards.map((sc) => (
          <div className="bg-white p-[11px_16px]" key={sc.label}>
            <div className="mb-1 font-mono text-[7.5px] uppercase tracking-widest text-[#A09D98]">{sc.label}</div>
            <div className="text-xl font-bold" style={{ color: sc.color }}>
              {sc.value}
            </div>
            <div className="mt-0.5 font-mono text-[7.5px] text-[#6B6860]">{sc.sub}</div>
          </div>
        ))}
      </div>

      <div className="flex shrink-0 border-b border-[#E2DFD9] bg-white">
        {filterTabs.map((tab) => (
          <button
            className="cursor-pointer border-none bg-transparent px-4 py-2.5 text-[10px]"
            key={tab.id}
            onClick={() => onFilterChange(tab.id)}
            style={{
              color: filter === tab.id ? tab.color : "#6B6860",
              borderBottom: filter === tab.id ? `2px solid ${tab.color}` : "2px solid transparent",
              fontWeight: filter === tab.id ? 700 : 500,
            }}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-[16px_20px_20px_24px]">
        <div className="border border-[#E2DFD9] bg-white">
          <div className="grid grid-cols-[28px_1fr_88px_76px_100px_110px_90px] border-b border-[#F0EFEB] bg-[#FAFAF8] p-[8px_14px] max-lg:hidden">
            <div />
            <div className="font-mono text-[7px] tracking-widest text-[#A09D98]">TASK</div>
            <div className="font-mono text-[7px] tracking-widest text-[#A09D98]">TYPE</div>
            <div className="font-mono text-[7px] tracking-widest text-[#A09D98]">PRIORITY</div>
            <div className="font-mono text-[7px] tracking-widest text-[#A09D98]">ASSIGNED TO</div>
            <div className="font-mono text-[7px] tracking-widest text-[#A09D98]">STATUS</div>
            <div className="font-mono text-[7px] tracking-widest text-[#A09D98]">DUE</div>
          </div>
          {tasks.map((t) => {
            const effective = getEffectiveTask(t.id);
            const typeSt = taskTypeStyle(effective.type);
            const priSt = taskPriorityStyle(effective.priority);
            const statusSt = taskStatusStyle(effective.status);
            const selected = t.id === selectedId;
            return (
              <button
                className="grid w-full cursor-pointer grid-cols-1 gap-2 border-b border-[#F5F4F0] p-[10px_14px] text-left transition-colors hover:bg-[#FAFAF8] max-lg:block lg:grid-cols-[28px_1fr_88px_76px_100px_110px_90px] lg:items-center lg:gap-0"
                key={t.id}
                onClick={() => onSelect(t.id)}
                style={{ background: selected ? "#F0F7FF" : "#fff" }}
                type="button"
              >
                <div className="flex items-center pt-0.5 max-lg:hidden">
                  {t.isAI ? <div className="ai-dot h-1.5 w-1.5 rounded-full bg-[#CC27B0]" /> : null}
                </div>
                <div>
                  <div className="mb-0.5 text-[11.5px] font-semibold leading-snug text-[#0D0E12]">{effective.title}</div>
                  <div className="font-mono text-[7.5px] text-[#A09D98]">{effective.meta}</div>
                </div>
                <div className="flex items-center max-lg:hidden">
                  <span className="font-mono text-[7.5px] px-[7px] py-0.5" style={{ background: typeSt.bg, color: typeSt.color }}>
                    {effective.type}
                  </span>
                </div>
                <div className="flex items-center max-lg:hidden">
                  <span className="font-mono text-[7.5px] px-[7px] py-0.5" style={{ background: priSt.bg, color: priSt.color }}>
                    {effective.priority}
                  </span>
                </div>
                <div className="flex items-center text-[10px] max-lg:hidden" style={{ color: effective.assigneeName ? "#0D0E12" : "#A09D98" }}>
                  {effective.assigneeName ?? "—"}
                </div>
                <div className="flex items-center max-lg:hidden">
                  <span className="whitespace-nowrap font-mono text-[7.5px] px-[7px] py-0.5" style={{ background: statusSt.bg, color: statusSt.color }}>
                    {effective.status}
                  </span>
                </div>
                <div className="font-mono flex items-center text-[8px] text-[#6B6860] max-lg:hidden">{effective.due}</div>
              </button>
            );
          })}
          {tasks.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#A09D98]">No tasks match this filter</div>
          ) : null}
        </div>
      </div>
    </>
  );
}
