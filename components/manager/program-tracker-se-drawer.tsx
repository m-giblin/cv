"use client";

import Link from "next/link";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { DrawerProfileView } from "@/lib/plans/program-tracker-view";

export function ProgramTrackerSeDrawer({
  profile,
  onClose,
}: {
  profile: DrawerProfileView | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!profile) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [profile, onClose]);

  if (!profile || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/32" />
      <div
        className="relative z-[1] flex h-full w-[560px] max-w-[100vw] flex-col bg-white shadow-[-12px_0_48px_rgba(0,0,0,.22)] animate-[slideIn_0.2s_ease-out]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative shrink-0 bg-[#00143A] px-[18px] py-4">
          <div className="absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r from-[#0071CE] to-[#CC27B0]" />
          <div className="mt-0.5 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-white/15 font-mono text-sm font-medium text-white"
                style={{ background: profile.avatarBg }}
              >
                {profile.initials}
              </div>
              <div>
                <div className="font-display text-lg font-extrabold leading-none text-white">
                  {profile.name}
                </div>
                <div className="mt-1 font-mono text-[8.5px] tracking-wide text-white/45">
                  {profile.level} · Day {profile.day} of ramp
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="font-mono text-[8px] tracking-wide"
                style={{
                  color: profile.healthColor,
                  background: profile.healthBg,
                  padding: "3px 9px",
                }}
              >
                {profile.healthLabel}
              </span>
              <button
                className="flex h-7 w-7 items-center justify-center border border-white/15 bg-white/8 text-sm text-white/70"
                onClick={onClose}
                type="button"
              >
                ×
              </button>
            </div>
          </div>

          <div className="mt-3.5 grid grid-cols-4 gap-px border border-white/8 bg-white/8">
            {[
              { value: String(profile.programCount), label: "PROGRAMS", color: "#fff" },
              { value: profile.overall, label: "AVG PROGRESS", color: profile.healthColor },
              { value: String(profile.overdueCount), label: "OVERDUE", color: "#B83128" },
              { value: String(profile.certsCleared), label: "GATES CLEARED", color: "#0A6E45" },
            ].map((stat) => (
              <div className="bg-black/20 px-2.5 py-2 text-center" key={stat.label}>
                <div className="font-mono text-sm font-medium" style={{ color: stat.color }}>
                  {stat.value}
                </div>
                <div className="mt-0.5 font-mono text-[7.5px] tracking-wide text-white/40">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2.5 flex gap-1.5">
            <Link
              className="flex flex-1 items-center justify-center bg-[#0071CE] px-2.5 py-1.5 text-[10px] font-semibold text-white"
              href={`/manager?section=cadence&profile=${profile.userId}`}
            >
              Schedule 1:1
            </Link>
            <button
              className="flex flex-1 items-center justify-center bg-[#D4810A] px-2.5 py-1.5 text-[10px] font-semibold text-white"
              type="button"
            >
              Nudge SE
            </button>
            <Link
              className="flex flex-1 items-center justify-center border border-white/20 px-2.5 py-1.5 text-[10px] font-semibold text-white/70"
              href={`/manager?section=roster&profile=${profile.userId}`}
            >
              View plan →
            </Link>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#F5F4F0]">
          <div className="px-4 pt-3.5">
            <p className="mb-2.5 font-mono text-[8px] uppercase tracking-[0.12em] text-[#A09D98]">
              Active programs
            </p>
            {profile.programs.map((program) => (
              <div
                className="mb-2.5 border bg-white"
                key={program.name}
                style={{ borderColor: program.borderColor }}
              >
                <div className="flex items-center justify-between border-b border-[#F0EFEB] px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-[7px] w-[7px] shrink-0 rounded-full"
                      style={{ background: program.typeColor }}
                    />
                    <span className="text-xs font-semibold text-[#0D0E12]">{program.name}</span>
                    <span
                      className="font-mono text-[7.5px] uppercase tracking-wide"
                      style={{ color: program.typeColor }}
                    >
                      {program.type}
                    </span>
                  </div>
                  <span
                    className="font-mono text-[7.5px] tracking-wide"
                    style={{
                      color: program.statusColor,
                      background: program.statusBg,
                      padding: "2px 7px",
                    }}
                  >
                    {program.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="flex-1">
                    <div className="mb-1 flex justify-between">
                      <span className="text-[9.5px] text-[#6B6860]">Progress</span>
                      <span
                        className="font-mono text-[9.5px] font-medium"
                        style={{ color: program.statusColor }}
                      >
                        {program.pct}%
                      </span>
                    </div>
                    <div className="h-1 overflow-hidden bg-[#ECEAE6]">
                      <div
                        className="h-full"
                        style={{ width: `${program.pct}%`, background: program.statusColor }}
                      />
                    </div>
                  </div>
                  <span className="whitespace-nowrap text-[9.5px] text-[#A09D98]">
                    Due {program.due}
                  </span>
                </div>
                <div className="border-t border-[#F0EFEB]">
                  {program.steps.map((step) => (
                    <div
                      className="flex items-center gap-2 border-b border-[#F9F8F6] px-3 py-1.5 last:border-b-0"
                      key={`${step.label}-${step.date}`}
                    >
                      <div
                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px] text-[8px]"
                        style={{
                          background: step.dotBg,
                          borderColor: step.dotBorder,
                          color: step.dotColor,
                        }}
                      >
                        {step.check}
                      </div>
                      <span
                        className="flex-1 text-[11px]"
                        style={{ color: step.textColor, textDecoration: step.strike }}
                      >
                        {step.label}
                      </span>
                      <span
                        className="whitespace-nowrap font-mono text-[8.5px]"
                        style={{ color: step.dateColor }}
                      >
                        {step.date}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 pb-4">
            <p className="mb-2.5 font-mono text-[8px] uppercase tracking-[0.12em] text-[#A09D98]">
              Recent activity
            </p>
            {profile.activity.length === 0 ? (
              <p className="text-[11px] text-[#A09D98]">No recent activity logged.</p>
            ) : (
              profile.activity.map((entry, index) => (
                <div className="flex gap-2.5 border-b border-[#ECEAE6] py-1.5" key={index}>
                  <div
                    className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: entry.dotColor }}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] text-[#0D0E12]">{entry.label}</span>
                    <span className="ml-1.5 text-[10px] text-[#A09D98]">{entry.program}</span>
                  </div>
                  <span className="shrink-0 font-mono text-[8.5px] text-[#A09D98]">{entry.date}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
