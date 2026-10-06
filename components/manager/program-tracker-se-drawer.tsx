"use client";

import Link from "next/link";
import { Drawer } from "@/components/ui/drawer";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { Tag } from "@/components/ui/tag";
import type { DrawerProfileView, ProgramStepView } from "@/lib/plans/program-tracker-view";
import { cn } from "@/lib/utils";

/** Maps the view model's health label (CRITICAL / BEHIND / AHEAD / ON PACE) to a status pill. */
export function healthTag(label: string): { tone: StatusTone; text: string } {
  const key = label.trim().toUpperCase();
  if (key === "CRITICAL") return { tone: "danger", text: "Critical" };
  if (key === "BEHIND") return { tone: "warning", text: "Behind" };
  if (key === "AHEAD") return { tone: "blue", text: "Ahead" };
  return { tone: "success", text: label.charAt(0) + label.slice(1).toLowerCase() };
}

/** Maps a program status string from the view model to a status pill tone. */
export function programStatusTag(status: string): { tone: StatusTone } {
  switch (status) {
    case "Critical":
      return { tone: "danger" };
    case "Behind":
      return { tone: "warning" };
    case "Complete":
    case "On track":
      return { tone: "success" };
    case "Not started":
      return { tone: "neutral" };
    default:
      return { tone: "blue" };
  }
}

/** 34px person-cell avatar (44 for drawer headers). */
export function InitialsAvatar({ initials, size = 34 }: { initials: string; size?: 34 | 44 }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-blue-soft font-bold text-blue",
        size === 44 ? "h-11 w-11 text-[15px]" : "h-[34px] w-[34px] text-[13px]",
      )}
    >
      {initials}
    </span>
  );
}

/** 8px progress bar, blue on the track (danger when the program is critical). */
export function TrackerProgressBar({
  pct,
  danger = false,
  className,
  label,
}: {
  pct: number;
  danger?: boolean;
  className?: string;
  label?: string;
}) {
  const width = Math.max(0, Math.min(100, pct));
  return (
    <div
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={cn("h-2 overflow-hidden rounded-[4px] bg-track", className)}
      role={label ? "img" : undefined}
    >
      <div className={cn("h-full rounded-[4px]", danger ? "bg-danger" : "bg-blue")} style={{ width: `${width}%` }} />
    </div>
  );
}

/** View-model copy still carries "·" and "—" separators; render them as plain punctuation. */
export function trackerCopy(text: string) {
  return text
    .replace(/\s*→\s*$/, "")
    .replaceAll(" · ", ", ")
    .replaceAll(" — ", ": ")
    .replace(/\(Wks (\d+)–(\d+)\)/, "(weeks $1 to $2)");
}

const STEP_STATUS: Record<ProgramStepView["status"], { tone: StatusTone; label: string }> = {
  done: { tone: "success", label: "Done" },
  active: { tone: "blue", label: "In progress" },
  blocked: { tone: "danger", label: "Blocked" },
  upcoming: { tone: "neutral", label: "Upcoming" },
};

function dueLabel(due: string) {
  return due && due !== "—" ? `Due ${due}` : "No due date";
}

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
      title={
        profile ? (
          <span className="flex items-center gap-3.5">
            <InitialsAvatar initials={profile.initials} size={44} />
            <span className="flex min-w-0 flex-col">
              <span className="text-[22px] leading-[1.15] font-extrabold tracking-[-0.015em] text-ink">{profile.name}</span>
              <span className="text-[13px] font-normal text-muted">
                {profile.level}, day {profile.day} of ramp
              </span>
            </span>
          </span>
        ) : (
          ""
        )
      }
    >
      {profile && health ? (
        <div className="flex flex-col gap-6">
          <StatusPill tone={health.tone}>{health.text}</StatusPill>

          <dl className="grid grid-cols-2 overflow-hidden rounded-[14px] border border-line bg-white">
            {[
              { value: String(profile.programCount), label: "Programs", danger: false },
              { value: profile.overall === "—" ? "None" : profile.overall, label: "Avg progress", danger: false },
              { value: String(profile.overdueCount), label: "Overdue", danger: profile.overdueCount > 0 },
              { value: String(profile.certsCleared), label: "Gates cleared", danger: false },
            ].map((stat, index) => (
              <div
                className={cn("px-4 py-3", index % 2 === 0 && "border-r border-divider", index < 2 && "border-b border-divider")}
                key={stat.label}
              >
                <dt className="label-caps whitespace-nowrap">{stat.label}</dt>
                <dd
                  className={cn(
                    "num mt-1.5 text-[28px] leading-none font-extrabold tracking-[-0.03em]",
                    stat.danger ? "text-danger" : "text-blue",
                  )}
                >
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>

          <section className="flex flex-col gap-3">
            <h3 className="label-caps">Active programs</h3>
            {profile.programs.length === 0 ? (
              <p className="text-sm text-muted">No active programs.</p>
            ) : (
              profile.programs.map((program) => {
                const status = programStatusTag(program.status);
                const bad = program.status === "Critical";
                return (
                  <div
                    className={cn(
                      "overflow-hidden rounded-[14px] border border-line bg-white",
                      bad && "shadow-[inset_3px_0_0_var(--color-danger)]",
                    )}
                    key={program.name}
                  >
                    <div className="flex items-start justify-between gap-3 px-4 pt-3.5">
                      <div className="flex min-w-0 flex-col items-start gap-1.5">
                        <Tag tone="blue">{program.type}</Tag>
                        <p className="text-[15px] font-bold text-ink">{program.name}</p>
                      </div>
                      <StatusPill tone={status.tone}>{program.status}</StatusPill>
                    </div>
                    <div className="flex flex-col gap-1.5 px-4 pt-2.5 pb-3.5">
                      <div className="flex items-baseline justify-between gap-3 text-[13px]">
                        <span className="text-muted">{dueLabel(program.due)}</span>
                        <span className={cn("num font-bold", bad ? "text-danger" : "text-blue")}>{program.pct}%</span>
                      </div>
                      <TrackerProgressBar danger={bad} label={`${program.pct}% complete`} pct={program.pct} />
                    </div>
                    {program.steps.length > 0 ? (
                      <ul className="border-t border-divider">
                        {program.steps.map((step) => {
                          const stepStatus = STEP_STATUS[step.status];
                          return (
                            <li
                              className="flex items-center gap-3 border-b border-divider px-4 py-2.5 last:border-b-0"
                              key={`${step.label}-${step.date}`}
                            >
                              <span className="flex min-w-0 flex-1 flex-col">
                                <span className={cn("text-sm", step.status === "done" ? "text-muted" : "text-ink")}>
                                  {step.label}
                                </span>
                                {step.date !== "—" ? (
                                  <span className={cn("text-[13px]", step.status === "blocked" ? "text-danger" : "text-muted")}>
                                    {step.date}
                                  </span>
                                ) : null}
                              </span>
                              <StatusPill tone={stepStatus.tone}>{stepStatus.label}</StatusPill>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </div>
                );
              })
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="label-caps">Recent activity</h3>
            {profile.activity.length === 0 ? (
              <p className="text-sm text-muted">No recent activity logged.</p>
            ) : (
              <ul className="overflow-hidden rounded-[14px] border border-line bg-white">
                {profile.activity.map((entry, index) => (
                  <li className="flex gap-3 border-b border-divider px-4 py-2.5 last:border-b-0" key={index}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink">{entry.label}</p>
                      <p className="text-[13px] text-muted">{trackerCopy(entry.program)}</p>
                    </div>
                    {entry.date !== "—" ? <span className="shrink-0 text-[13px] text-muted">{entry.date}</span> : null}
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
