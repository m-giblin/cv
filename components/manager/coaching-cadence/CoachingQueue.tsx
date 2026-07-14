"use client";

import type { SEProfile } from "./types";
import { urgencyScores } from "./data";

const BADGES: Record<string, { text: string; color: string; bg: string; border: string }> = {
  DS: { text: "COACH NOW", color: "#B83128", bg: "rgba(184,49,40,.15)", border: "#B83128" },
  FG: { text: "BEHIND", color: "#D4810A", bg: "rgba(212,129,10,.12)", border: "#D4810A" },
  GH: { text: "ON PACE", color: "#0A6E45", bg: "rgba(10,110,69,.1)", border: "#E2DFD9" },
  HI: { text: "AHEAD", color: "#0071CE", bg: "rgba(0,113,206,.1)", border: "#E2DFD9" },
};

const SIGNALS: Record<string, string> = {
  DS: "4 blocked milestones · Sim dropping 23 pts · Day 22, never coached",
  FG: "4 overdue items · Demo score below threshold · No 1:1 history",
  GH: "On track · Sim improving · Competitive gap is the only blocker",
  HI: "Ahead of pace · Top sim on team · Ready for career conversation",
};

const SIM_TRENDS: Record<string, string> = {
  DS: "66 ↓",
  FG: "58 ↓",
  GH: "82 ↑",
  HI: "91 ↑",
};

export function CoachingQueue({
  keys,
  profiles,
  selectedKey,
  onSelect,
}: {
  keys: string[];
  profiles: Record<string, SEProfile>;
  selectedKey: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="flex w-[310px] shrink-0 flex-col overflow-hidden border-r border-[#E2DFD9] bg-white">
      <div className="flex shrink-0 items-center justify-between border-b border-[#E2DFD9] px-3.5 py-2.5">
        <span className="font-mono text-[8px] font-medium uppercase tracking-[0.12em] text-[#3D3C38]">
          Coaching queue
        </span>
        <span className="font-mono text-[8px] text-[#A09D98]">Sorted by urgency</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {keys.map((key) => {
          const p = profiles[key];
          const sel = key === selectedKey;
          const b = BADGES[key] ?? {
            text: "UNKNOWN",
            color: "#888",
            bg: "rgba(0,0,0,.05)",
            border: "#E2DFD9",
          };
          const urgency = urgencyScores[key] ?? 0;
          return (
            <button
              className="block w-full cursor-pointer border-b border-[#F0EFEB] text-left transition-colors hover:bg-[#F0EFEB]"
              key={key}
              onClick={() => onSelect(key)}
              style={{
                padding: "12px 14px",
                borderLeft: `3px solid ${sel ? "#0071CE" : b.border}`,
                background: sel ? "#F0F7FF" : "#fff",
              }}
              type="button"
            >
              <div className="mb-1.5 flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-medium text-white"
                    style={{ background: p.avatarBg }}
                  >
                    {p.initials}
                  </div>
                  <div>
                    <div className="text-[12.5px] font-semibold text-[#0D0E12]">{p.name}</div>
                    <div className="mt-px font-mono text-[8px] text-[#A09D98]">
                      {p.level} · Day {p.day}
                    </div>
                  </div>
                </div>
                <span
                  className="whitespace-nowrap font-mono text-[7.5px] font-medium tracking-[0.06em]"
                  style={{ color: b.color, background: b.bg, padding: "2px 7px" }}
                >
                  {b.text}
                </span>
              </div>
              <div className="mb-1.5 pl-[43px] text-[10.5px] leading-snug text-[#6B6860]">
                {SIGNALS[key]}
              </div>
              <div className="flex items-center gap-2.5 pl-[43px]">
                <span className="font-mono text-[8px] text-[#A09D98]">
                  1:1 <strong style={{ color: p.lastColor }}>{p.lastLabel}</strong>
                </span>
                <span className="font-mono text-[8px] text-[#A09D98]">
                  Sim{" "}
                  <strong style={{ color: p.simColor }}>{SIM_TRENDS[key] ?? p.simAvg}</strong>
                </span>
                <span className="font-mono text-[8px] text-[#A09D98]">
                  Ramp <strong style={{ color: p.rampColor }}>{p.ramp}</strong>
                </span>
                <span className="sr-only">Urgency {urgency}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
