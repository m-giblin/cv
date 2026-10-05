"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { Tag } from "@/components/ui/tag";
import { managerSectionHref } from "@/lib/manager/manager-routes";
import { downloadOneOnOneIcs } from "@/lib/manager/one-on-one-ics";
import type { TeamMember, TeamStatus } from "@/lib/manager/team-status";
import { cn } from "@/lib/utils";

/** Mono label over a 40/800 numeral, with an optional inline danger note ("5 OVER 3D"). */
export function HeaderStat({
  label,
  value,
  note,
  tone = "blue",
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  tone?: "blue" | "danger";
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="label-mono">{label}</span>
      <span
        className={cn(
          "text-[40px] leading-none font-extrabold tracking-[-0.03em]",
          tone === "danger" ? "text-danger" : "text-blue",
        )}
      >
        {value}
        {note ? (
          <span className="ml-1.5 font-mono text-xs font-medium tracking-normal text-danger uppercase">{note}</span>
        ) : null}
      </span>
    </div>
  );
}

const STATUS_TAG: Record<TeamStatus, { label: string; tone: "danger" | "blue" | "success" }> = {
  at_risk: { label: "▲ At risk", tone: "danger" },
  review_due: { label: "● Review due", tone: "blue" },
  on_track: { label: "✓ On track", tone: "success" },
};

export function TeamStatusTag({ status, className }: { status: TeamStatus; className?: string }) {
  const tag = STATUS_TAG[status];
  return (
    <Tag className={cn("justify-self-start bg-transparent", className)} tone={tag.tone}>
      {tag.label}
    </Tag>
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
  // `.link` is unlayered CSS, so utilities can't recolour it; the on-dark variant is spelled out.
  const cls = cn(
    onDark
      ? "text-sm font-bold text-signal underline decoration-signal decoration-2 underline-offset-[3px] hover:text-white hover:decoration-white"
      : "link text-sm",
    className,
  );

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

export function InitialsAvatar({ name, size = 32 }: { name: string; size?: number }) {
  const letters = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full bg-blue-soft text-xs font-bold text-blue"
      style={{ width: size, height: size }}
    >
      {letters}
    </span>
  );
}
