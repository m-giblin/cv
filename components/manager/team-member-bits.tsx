"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { Stat } from "@/components/ui/stat";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { managerSectionHref } from "@/lib/manager/manager-routes";
import { downloadOneOnOneIcs } from "@/lib/manager/one-on-one-ics";
import type { TeamMember, TeamStatus } from "@/lib/manager/team-status";
import { cn } from "@/lib/utils";

/** Caps label over a 40/800 numeral, with an optional status-coloured subline ("5 older than 3 days"). */
export function HeaderStat({
  label,
  value,
  note,
  tone = "blue",
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  tone?: "blue" | "danger" | "ink";
}) {
  return <Stat label={label} note={note} noteTone="danger" tone={tone} value={value} />;
}

const STATUS_PILL: Record<TeamStatus, { label: string; tone: StatusTone }> = {
  at_risk: { label: "At risk", tone: "danger" },
  review_due: { label: "Waiting on you", tone: "warning" },
  on_track: { label: "On track", tone: "success" },
};

export function TeamStatusTag({ status, className }: { status: TeamStatus; className?: string }) {
  const pill = STATUS_PILL[status];
  return (
    <StatusPill className={className} tone={pill.tone}>
      {pill.label}
    </StatusPill>
  );
}

/** The single next action for a team member: review in the inbox, assign practice, or a 1:1 invite. */
export function TeamActionLink({
  member,
  readinessAvailable,
  onOpenProfile,
  onDark = false,
  className,
}: {
  member: TeamMember;
  readinessAvailable: boolean;
  onOpenProfile: (profileId: string) => void;
  onDark?: boolean;
  className?: string;
}) {
  const action = member.action;
  if (!action) return null;
  // Inside `.on-navy` the link turns amber on its own; `onDark` is kept for callers outside one.
  const cls = cn("link text-sm", onDark && "link--on-navy", className);

  if (action.kind === "assign_plan") {
    return (
      <Link className={cls} href={managerSectionHref("assign")}>
        {action.label}
      </Link>
    );
  }

  if (action.kind === "review" || action.kind === "sign_off") {
    return (
      <Link className={cls} href={managerSectionHref("inbox")}>
        {action.label}
      </Link>
    );
  }
  if (action.kind === "practice") {
    return readinessAvailable ? (
      <Link className={cls} href={managerSectionHref("readiness")}>
        {action.label}
      </Link>
    ) : (
      <button className={cls} onClick={() => onOpenProfile(member.profileId)} type="button">
        {action.label}
      </button>
    );
  }
  return (
    <button
      className={cn(cls, "cursor-pointer")}
      onClick={() => {
        downloadOneOnOneIcs({
          name: member.fullName,
          email: member.email,
          level: member.level,
          talkingPoints: member.talkingPoints.slice(0, 4),
        });
        toast.success(`1:1 invite for ${member.firstName} downloaded`);
      }}
      type="button"
    >
      {action.label}
    </button>
  );
}

export function initialsOf(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function InitialsAvatar({ name, size = 32 }: { name: string; size?: number }) {
  const letters = initialsOf(name);
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full bg-blue-soft text-[13px] font-bold text-blue"
      style={{ width: size, height: size }}
    >
      {letters}
    </span>
  );
}
