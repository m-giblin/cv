"use client";

import Link from "next/link";
import { Drawer } from "@/components/ui/drawer";
import { Tag } from "@/components/ui/tag";
import type { DrawerProfileView, ProgramStepView } from "@/lib/plans/program-tracker-view";

type TagTone = "neutral" | "blue" | "success" | "warning" | "danger" | "signal";

/** Maps the view model's health label (CRITICAL / BEHIND / AHEAD / ON PACE) to a tag. */
export function healthTag(label: string): { tone: TagTone; symbol: string; text: string } {
  const key = label.trim().toUpperCase();
  if (key === "CRITICAL") return { tone: "danger", symbol: "▲", text: "Critical" };
  if (key === "BEHIND") return { tone: "warning", symbol: "▲", text: "Behind" };
  if (key === "AHEAD") return { tone: "blue", symbol: "◆", text: "Ahead" };
  return { tone: "success", symbol: "●", text: label.charAt(0) + label.slice(1).toLowerCase() };
}

/** Maps a program status string from the view model to a tag. */
export function programStatusTag(status: string): { tone: TagTone; symbol: string } {
  switch (status) {
    case "Critical":
      return { tone: "danger", symbol: "▲" };
    case "Behind":
      return { tone: "warning", symbol: "▲" };
    case "Ahead":
      return { tone: "blue", symbol: "◆" };
    case "Complete":
      return { tone: "success", symbol: "✓" };
    case "On track":
      return { tone: "success", symbol: "●" };
    case "Not started":
      return { tone: "neutral", symbol: "•" };
    default:
      return { tone: "blue", symbol: "•" };
  }
}

export function InitialsAvatar({ initials, size = 28 }: { initials: string; size?: 28 | 32 | 44 }) {
  const sizeClass = size === 44 ? "h-11 w-11 text-sm" : size === 32 ? "h-8 w-8 text-xs" : "h-7 w-7 text-xs";
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full bg-blue-soft font-bold text-blue ${sizeClass}`}
    >
      {initials}
    </span>
  );
}

const STEP_DOT: Record<ProgramStepView["status"], string> = {
  done: "border-success bg-success text-white",
  active: "border-blue bg-blue text-white",
  blocked: "border-danger bg-danger text-white",
  upcoming: "border-line-strong bg-white text-muted",
};

const STEP_TEXT: Record<ProgramStepView["status"], string> = {
  done: "text-muted",
  active: "text-ink",
  blocked: "text-danger",
  upcoming: "text-ink",
};

export function ProgramTrackerSeDrawer({
  profile,
  onClose,
}: {
  profile: DrawerProfileView | null;
  onClose: () => void;
}) {
  const health = profile ? healthTag(profile.healthLabel) : null;

  return (
    <Drawer
      footer={
        profile ? (
          <>
            <Link className="btn-primary no-underline" href={`/manager/coaching?profile=${profile.userId}`}>
              Schedule 1:1
            </Link>
            <button className="btn-secondary" type="button">
              Nudge SE
            </button>
            <Link className="btn-secondary no-underline" href={`/manager/team?profile=${profile.userId}`}>
              View plan
            </Link>
          </>
        ) : undefined
      }
      onClose={onClose}
      open={profile !== null}
      title={profile?.name ?? ""}
    >
      {profile && health ? (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <InitialsAvatar initials={profile.initials} size={44} />
            <div className="min-w-0 flex-1">
              <p className="label-mono">
                {profile.level} · Day {profile.day} of ramp
              </p>
              <div className="mt-1">
                <Tag tone={health.tone}>
                  {health.symbol} {health.text}
                </Tag>
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-2 overflow-hidden rounded-[14px] border border-line">
            {[
              { value: String(profile.programCount), label: "Programs", danger: false },
              { value: profile.overall, label: "Avg progress", danger: false },
              { value: String(profile.overdueCount), label: "Overdue", danger: profile.overdueCount > 0 },
              { value: String(profile.certsCleared), label: "Gates cleared", danger: false },
            ].map((stat, index) => (
              <div
                className={`px-4 py-3 ${index % 2 === 0 ? "border-r border-divider" : ""} ${
                  index < 2 ? "border-b border-divider" : ""
                }`}
                key={stat.label}
              >
                <dt className="label-mono">{stat.label}</dt>
                <dd
                  className={`mt-1 text-[22px] font-extrabold leading-none tracking-[-0.03em] ${
                    stat.danger ? "text-danger" : "text-blue"
                  }`}
                >
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>

          <section>
            <h3 className="label-mono mb-2">Active programs</h3>
            {profile.programs.length === 0 ? (
              <p className="text-sm text-muted">No active programs.</p>
            ) : (
              <div className="space-y-3">
                {profile.programs.map((program) => {
                  const status = programStatusTag(program.status);
                  const bad = program.status === "Critical";
                  return (
                    <div
                      className={`overflow-hidden rounded-[14px] border bg-white ${
                        bad ? "border-danger" : "border-line"
                      }`}
                      key={program.name}
                    >
                      <div className="flex items-start justify-between gap-3 border-b border-divider px-4 py-3">
                        <div className="min-w-0">
                          <p className="label-mono">{program.type}</p>
                          <p className="mt-0.5 text-sm font-bold text-ink">{program.name}</p>
                        </div>
                        <Tag tone={status.tone}>
                          {status.symbol} {program.status}
                        </Tag>
                      </div>
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="flex-1">
                          <div className="mb-1 flex justify-between text-xs">
                            <span className="text-muted">Progress</span>
                            <span className={`font-mono font-medium ${bad ? "text-danger" : "text-blue"}`}>
                              {program.pct}%
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-divider">
                            <div
                              className={`h-full rounded-full ${bad ? "bg-danger" : "bg-blue"}`}
                              style={{ width: `${program.pct}%` }}
                            />
                          </div>
                        </div>
                        <span className="whitespace-nowrap font-mono text-xs text-muted">Due {program.due}</span>
                      </div>
                      {program.steps.length > 0 ? (
                        <ul className="border-t border-divider">
                          {program.steps.map((step) => (
                            <li
                              className="flex items-center gap-2.5 border-b border-divider px-4 py-2 last:border-b-0"
                              key={`${step.label}-${step.date}`}
                            >
                              <span
                                aria-hidden
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] text-xs ${
                                  STEP_DOT[step.status]
                                }`}
                              >
                                {step.check}
                              </span>
                              <span className="sr-only">{step.status}:</span>
                              <span
                                className={`flex-1 text-sm ${STEP_TEXT[step.status]} ${
                                  step.strike === "line-through" ? "line-through" : ""
                                }`}
                              >
                                {step.label}
                              </span>
                              <span
                                className={`whitespace-nowrap font-mono text-xs ${
                                  step.status === "blocked" ? "text-danger" : "text-muted"
                                }`}
                              >
                                {step.date}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <h3 className="label-mono mb-2">Recent activity</h3>
            {profile.activity.length === 0 ? (
              <p className="text-sm text-muted">No recent activity logged.</p>
            ) : (
              <ul className="overflow-hidden rounded-[14px] border border-line bg-white">
                {profile.activity.map((entry, index) => (
                  <li className="flex gap-3 border-b border-divider px-4 py-2.5 last:border-b-0" key={index}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink">{entry.label}</p>
                      <p className="text-xs text-muted">{entry.program}</p>
                    </div>
                    <span className="shrink-0 font-mono text-xs text-muted">{entry.date}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </Drawer>
  );
}
