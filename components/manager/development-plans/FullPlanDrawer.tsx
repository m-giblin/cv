"use client";

import type { SEDevProfile } from "./types";

function statusStyle(status: SEDevProfile["status"]): { bg: string; color: string } {
  switch (status) {
    case "ACTIVE":
      return { bg: "rgba(10,110,69,.08)", color: "#0A6E45" };
    case "AI PLAN READY":
      return { bg: "rgba(204,39,176,.08)", color: "#CC27B0" };
    case "NO PLAN":
      return { bg: "rgba(184,49,40,.08)", color: "#B83128" };
    case "COMPLETE":
      return { bg: "rgba(0,113,206,.08)", color: "#0071CE" };
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function FullPlanDrawer({
  se,
  onClose,
  onSyncCalendar,
}: {
  se: SEDevProfile;
  onClose: () => void;
  onSyncCalendar: () => void;
}) {
  const st = statusStyle(se.status);
  const goalTitles = se.goals.length > 0 ? se.goals.map((g) => g.title) : ["Pending approval"];

  return (
    <>
      <div className="fixed inset-0 z-[800] bg-black/40" onClick={onClose} role="presentation" />
      <div className="fixed bottom-0 right-0 top-0 z-[801] flex w-[560px] max-w-full flex-col bg-white animate-[slideIn_0.25s_ease]">
        <div className="relative shrink-0 bg-[#00143A] p-[16px_20px]">
          <div className="absolute left-0 right-0 top-0 h-[3px] bg-gradient-to-r from-[#0071CE] to-[#CC27B0]" />
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                style={{ background: se.avatarBg }}
              >
                {se.initials}
              </div>
              <div>
                <div className="mb-1 font-mono text-[8px] uppercase tracking-[0.12em] text-white/40">Full Development Plan</div>
                <div className="font-display text-lg font-bold text-white">{se.name}</div>
                <div className="mt-0.5 font-mono text-[8px] text-white/40">
                  {se.level} · {se.role} · Day {se.day}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[7.5px] px-[9px] py-[3px]" style={{ background: st.bg, color: st.color }}>
                {se.status}
              </span>
              <button
                className="flex h-8 w-8 cursor-pointer items-center justify-center border border-white/15 bg-white/10 text-lg text-white/60"
                onClick={onClose}
                type="button"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto p-[16px_20px]">
          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <div className="ai-dot h-1.5 w-1.5 shrink-0 rounded-full bg-[#CC27B0]" />
              <span className="font-mono text-[8px] tracking-widest text-[#CC27B0]">
                AI DATA SIGNALS — {se.signals.length} FACTORS REVIEWED
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {se.signals.map((sig) => (
                <div
                  className="border border-[#EEECE8] bg-[#FAFAF8] p-[10px_12px]"
                  key={sig.label}
                  style={{ borderLeft: `3px solid ${sig.color}` }}
                >
                  <div className="mb-1 flex items-center gap-1.5">
                    <span className="text-[13px]">{sig.icon}</span>
                    <span className="font-mono text-[7.5px] tracking-wide text-[#A09D98]">{sig.label}</span>
                  </div>
                  <div className="mb-0.5 text-[11.5px] font-bold" style={{ color: sig.color }}>
                    {sig.value}
                  </div>
                  <div className="text-[9.5px] leading-snug text-[#6B6860]">{sig.detail}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1.5 font-mono text-[8px] uppercase tracking-widest text-[#A09D98]">Active goals</div>
            <div className="flex flex-col gap-1">
              {goalTitles.map((goal) => (
                <div
                  className="flex items-center gap-2 border border-[rgba(0,113,206,.12)] bg-[#F0F7FF] p-[9px_12px]"
                  key={goal}
                >
                  <span className="shrink-0 text-xs text-[#0071CE]">▸</span>
                  <span className="text-[11px] font-medium text-[#0D0E12]">{goal}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <div className="font-mono text-[8px] uppercase tracking-widest text-[#A09D98]">Plan Calendar milestones</div>
              <span className="font-mono text-[7.5px] text-[#0071CE]">📅 Auto-synced</span>
            </div>
            <div className="flex flex-col gap-[3px]">
              {se.calendarItems.map((cal) => (
                <div
                  className="flex items-center gap-2 border border-[rgba(10,110,69,.1)] bg-[#F5FDF9] p-[7px_10px]"
                  key={cal}
                >
                  <span className="shrink-0 text-[10px] text-[#0A6E45]">📅</span>
                  <span className="text-[10.5px] text-[#3D3C38]">{cal}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-2 border-t border-[#E2DFD9] p-[14px_20px]">
          <button
            className="flex-1 cursor-pointer border border-[#D4D1CB] bg-[#F5F4F0] py-2 text-[10px] font-semibold text-[#3D3C38]"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
          <button
            className="flex-1 cursor-pointer border border-[rgba(0,113,206,.2)] bg-[#F0F7FF] py-2 text-[10px] font-semibold text-[#0071CE]"
            onClick={onSyncCalendar}
            type="button"
          >
            Sync to Calendar
          </button>
        </div>
      </div>
    </>
  );
}
