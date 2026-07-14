"use client";

import type { SEProfile } from "./types";

export function SEProfilePanel({
  se,
  onSchedule,
  onDownloadBrief,
  onCopyBrief,
  onLogNote,
}: {
  se: SEProfile;
  onSchedule: () => void;
  onDownloadBrief: () => void;
  onCopyBrief: () => void;
  onLogNote: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      {/* SE Header */}
      <div className="relative shrink-0 bg-[#00143A] px-5 py-4">
        <div className="absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r from-[#0071CE] to-[#CC27B0]" />
        <div className="mt-0.5 flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-white/15 font-mono text-[15px] font-medium text-white"
              style={{ background: se.avatarBg }}
            >
              {se.initials}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <div className="font-display text-xl font-extrabold leading-none text-white">
                  {se.name}
                </div>
                <span
                  className="font-mono text-[8px] tracking-[0.08em]"
                  style={{
                    color: se.healthColor,
                    background: se.healthBg,
                    padding: "3px 10px",
                  }}
                >
                  {se.healthLabel}
                </span>
              </div>
              <div className="mt-1 font-mono text-[8.5px] tracking-[0.1em] text-white/40">
                {se.level} · Day {se.day} of ramp
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              className="cursor-pointer border border-white/20 bg-white/10 px-3 py-1.5 text-[9.5px] font-semibold text-white/70"
              onClick={onCopyBrief}
              type="button"
            >
              Copy brief
            </button>
            <button
              className="cursor-pointer border border-white/20 bg-white/10 px-3 py-1.5 text-[9.5px] font-semibold text-white/70"
              onClick={onDownloadBrief}
              type="button"
            >
              Download PDF
            </button>
            <button
              className="cursor-pointer border-none bg-[#0071CE] px-3.5 py-[7px] text-[10px] font-semibold text-white"
              onClick={onSchedule}
              type="button"
            >
              Schedule 1:1 →
            </button>
          </div>
        </div>

        <div className="mt-3.5 grid grid-cols-4 gap-px border border-white/10 bg-white/10">
          {[
            { label: "Last 1:1", value: se.lastLabel, color: se.lastColor },
            {
              label: "Sim avg (last 5)",
              value: (
                <>
                  {se.simAvg}{" "}
                  <span className="text-[9px]" style={{ color: se.trendColor }}>
                    {se.trendLabel}
                  </span>
                </>
              ),
              color: se.simColor,
            },
            { label: "Ramp completion", value: se.ramp, color: se.rampColor },
            { label: "Overdue items", value: se.overdue, color: se.overdueColor },
          ].map((stat) => (
            <div className="bg-black/20 px-3 py-2" key={stat.label}>
              <div className="mb-0.5 font-mono text-[7.5px] uppercase tracking-[0.1em] text-white/40">
                {stat.label}
              </div>
              <div className="font-mono text-[13px] font-medium" style={{ color: stat.color }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto bg-[#F5F4F0] p-[18px_20px]">
        <div className="grid grid-cols-2 gap-3.5">
          {/* Sim trend */}
          <div className="border border-[#E2DFD9] bg-white p-[14px_16px]">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-mono text-[8px] font-medium uppercase tracking-[0.12em] text-[#3D3C38]">
                Sim score trend
              </div>
              <span className="text-[9.5px] text-[#A09D98]">Last {se.simScores.length} sessions</span>
            </div>
            <div className="relative mb-2">
              <svg
                className="block w-full"
                height="56"
                preserveAspectRatio="none"
                viewBox="0 0 260 56"
              >
                {[14, 28, 42].map((y) => (
                  <line key={y} stroke="#F0EFEB" strokeWidth="1" x1="0" x2="260" y1={y} y2={y} />
                ))}
                <line
                  stroke="#E2DFD9"
                  strokeDasharray="4,3"
                  strokeWidth="1"
                  x1="0"
                  x2="260"
                  y1={se.thresholdY}
                  y2={se.thresholdY}
                />
                <path d={se.sparkArea} fill={se.sparkFill} opacity="0.12" />
                <polyline
                  fill="none"
                  points={se.sparkPts}
                  stroke={se.sparkColor}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
                {se.sparkDots.map((dot, index) => (
                  <circle
                    cx={dot.x}
                    cy={dot.y}
                    fill={se.sparkColor}
                    key={`${dot.x}-${index}`}
                    r="3.5"
                    stroke="#fff"
                    strokeWidth="1.5"
                  />
                ))}
              </svg>
            </div>
            <div className="flex justify-between px-0.5">
              {se.simScores.map((score, index) => (
                <div className="flex-1 text-center" key={`score-${index}`}>
                  <div className="font-mono text-[9px] font-medium" style={{ color: se.sparkColor }}>
                    {score}
                  </div>
                  <div className="font-mono text-[7.5px] text-[#A09D98]">S{index + 1}</div>
                </div>
              ))}
            </div>
            <div className="mt-2.5 flex items-center gap-2 border-t border-[#F0EFEB] pt-2.5">
              <span
                className="font-mono text-[8px] tracking-[0.06em]"
                style={{ color: se.trendColor, background: se.trendBg, padding: "2px 8px" }}
              >
                {se.trendLabel}
              </span>
              <span className="text-[10px] text-[#6B6860]">{se.trendDesc}</span>
            </div>
          </div>

          {/* Competency profile */}
          <div className="border border-[#E2DFD9] bg-white p-[14px_16px]">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-mono text-[8px] font-medium uppercase tracking-[0.12em] text-[#3D3C38]">
                Competency profile
              </div>
              <span className="text-[9px] text-[#A09D98]">threshold: 70</span>
            </div>
            {se.skills.map((sk) => (
              <div className="mb-2.5" key={sk.name}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10.5px] text-[#3D3C38]">{sk.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[9px] font-medium" style={{ color: sk.color }}>
                      {sk.score}
                    </span>
                    <span
                      className="font-mono text-[7.5px] tracking-[0.04em]"
                      style={{ color: sk.tagColor, background: sk.tagBg, padding: "1px 5px" }}
                    >
                      {sk.tag}
                    </span>
                  </div>
                </div>
                <div className="h-[5px] overflow-hidden bg-[#ECEAE6]">
                  <div
                    className="h-[5px] transition-[width] duration-500 ease-out"
                    style={{ width: sk.width, background: sk.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Brief */}
        <div className="border border-[#E2DFD9] bg-white">
          <div className="flex items-center justify-between border-b border-[#E2DFD9] bg-[#F9F8F6] px-4 py-[11px]">
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center bg-gradient-to-br from-[#0071CE] to-[#CC27B0]">
                <svg fill="white" height="10" viewBox="0 0 12 12" width="10">
                  <path d="M6 1L7.5 4.5H11L8.25 6.75L9.25 10.5L6 8.25L2.75 10.5L3.75 6.75L1 4.5H4.5Z" />
                </svg>
              </div>
              <span className="font-mono text-[8px] font-medium uppercase tracking-[0.12em] text-[#3D3C38]">
                AI 1:1 brief
              </span>
              <span className="text-[9.5px] text-[#A09D98]">
                · Generated from sim data, ramp velocity, overdue items
              </span>
            </div>
            <span className="font-mono text-[7.5px] text-[#A09D98]">{se.briefDate}</span>
          </div>
          {se.brief.map((pt, index) => (
            <div
              className="flex gap-3 border-b border-[#F9F8F6] px-4 py-[11px] last:border-b-0"
              key={`${pt.tag}-${index}`}
            >
              <div
                className="mt-px flex h-5 w-5 shrink-0 items-center justify-center text-[11px]"
                style={{ background: pt.iconBg }}
              >
                {pt.icon}
              </div>
              <div className="flex-1">
                <div className="mb-0.5 text-xs leading-normal text-[#0D0E12]">{pt.text}</div>
                {pt.hasAction && pt.actionFn ? (
                  <button
                    className="mt-0.5 cursor-pointer px-2 py-0.5 text-[9px] font-semibold"
                    onClick={pt.actionFn}
                    style={{
                      background: pt.actionBg,
                      color: pt.actionColor,
                      border: pt.actionBorder,
                    }}
                    type="button"
                  >
                    {pt.action}
                  </button>
                ) : null}
              </div>
              <span
                className="mt-px h-fit whitespace-nowrap self-start font-mono text-[8px] tracking-[0.05em]"
                style={{ color: pt.tagColor, background: pt.tagBg, padding: "2px 7px" }}
              >
                {pt.tag}
              </span>
            </div>
          ))}
        </div>

        {/* Coaching history */}
        <div className="border border-[#E2DFD9] bg-white">
          <div className="border-b border-[#E2DFD9] bg-[#F9F8F6] px-4 py-[11px]">
            <span className="font-mono text-[8px] font-medium uppercase tracking-[0.12em] text-[#3D3C38]">
              Coaching history
            </span>
          </div>
          {se.hasHistory ? (
            se.history.map((h, index) => (
              <div
                className="flex items-start gap-3.5 border-b border-[#F9F8F6] px-4 py-[11px] last:border-b-0"
                key={`${h.date}-${index}`}
              >
                <div className="w-[38px] shrink-0 text-center">
                  <div className="font-mono text-[9px] font-medium text-[#6B6860]">{h.date}</div>
                  <div className="mt-px font-mono text-[7px] text-[#A09D98]">{h.dow}</div>
                </div>
                <div className="h-9 w-px shrink-0 bg-[#E2DFD9]" />
                <div className="flex-1">
                  <div className="mb-0.5 flex items-center gap-2">
                    <span className="text-[11.5px] font-medium text-[#0D0E12]">{h.focus}</span>
                    <span
                      className="font-mono text-[7.5px] tracking-[0.04em]"
                      style={{ color: h.outcomeColor, background: h.outcomeBg, padding: "1px 6px" }}
                    >
                      {h.outcomeLabel}
                    </span>
                  </div>
                  <div className="text-[10.5px] leading-snug text-[#7A7772]">{h.note}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-mono text-[8.5px] font-medium" style={{ color: h.deltaColor }}>
                    {h.delta}
                  </div>
                  <div className="mt-px font-mono text-[7px] text-[#A09D98]">sim change</div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center gap-2.5 px-4 py-5">
              <div className="flex h-8 w-8 items-center justify-center bg-[#FEF0EE] text-base">⚠️</div>
              <div>
                <div className="mb-0.5 text-xs font-medium text-[#B83128]">
                  No coaching sessions logged
                </div>
                <div className="text-[10.5px] text-[#7A7772]">
                  {se.name} is on Day {se.day} with zero 1:1s recorded. Every day without coaching at
                  this ramp stage compounds the gap.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="flex shrink-0 items-center gap-2 border-t border-[#E2DFD9] bg-white px-5 py-2.5">
        <span className="mr-1 font-mono text-[8px] uppercase tracking-[0.1em] text-[#A09D98]">
          Quick actions
        </span>
        {se.actions.map((act) => (
          <button
            className="cursor-pointer px-3 py-1.5 text-[9.5px] font-semibold"
            key={act.label}
            onClick={act.label === "Log coaching note" ? onLogNote : act.fn}
            style={{ background: act.bg, color: act.color, border: act.border }}
            type="button"
          >
            {act.label}
          </button>
        ))}
      </div>
    </div>
  );
}
