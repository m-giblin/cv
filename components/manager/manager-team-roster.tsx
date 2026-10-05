"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { TeamActionLink, TeamStatusTag } from "@/components/manager/team-member-bits";
import { PageHeader } from "@/components/ui/page-header";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { Stamp } from "@/components/ui/stamp";
import type { TeamMember, TeamStatus } from "@/lib/manager/team-status";
import { cn } from "@/lib/utils";

type View = "table" | "status";
type SortKey = "urgency" | "name" | "readiness";

const VIEW_STORAGE_KEY = "manager-roster-view";

function metaLine(member: TeamMember) {
  const ramp = member.rampTotal > 0 ? `Ramp ${member.rampDone}/${member.rampTotal}` : "No ramp plan";
  return `${member.level} · ${ramp} · Gates ${member.gatesCleared}/${member.gates.length}`;
}

function levelSummary(members: TeamMember[]) {
  const counts = new Map<string, number>();
  for (const member of members) counts.set(member.level, (counts.get(member.level) ?? 0) + 1);
  return [`${members.length} SE${members.length === 1 ? "" : "s"}`, ...[...counts].map(([level, n]) => `${n} ${level}`)].join(
    " · ",
  );
}

function ColumnHeader({ label, count }: { label: string; count: number }) {
  return (
    <h2 className="flex items-center justify-between rounded-[10px] bg-blue px-3.5 py-[9px] font-mono text-xs font-medium text-white uppercase">
      <span>{label}</span>
      <span className="text-signal">{count}</span>
    </h2>
  );
}

function NameButton({
  member,
  onOpen,
  className,
}: {
  member: TeamMember;
  onOpen: (id: string) => void;
  className?: string;
}) {
  return (
    <button
      className={cn("text-left text-[17px] font-bold hover:underline", className)}
      onClick={() => onOpen(member.profileId)}
      type="button"
    >
      {member.fullName}
    </button>
  );
}

function StatusColumns({
  members,
  onOpenProfile,
  readinessAvailable,
}: {
  members: TeamMember[];
  onOpenProfile: (id: string) => void;
  readinessAvailable: boolean;
}) {
  const by = (status: TeamStatus) => members.filter((member) => member.status === status);
  const atRisk = by("at_risk");
  const waiting = by("review_due");
  const onTrack = by("on_track");
  const empty = (text: string): ReactNode => (
    <p className="rounded-[14px] border border-dashed border-line-strong px-4 py-5 text-sm text-muted">{text}</p>
  );

  return (
    <div className="grid grid-cols-1 items-start gap-5 px-[var(--gutter)] pt-[18px] pb-7 lg:grid-cols-3">
      <section aria-label="At risk" className="flex flex-col gap-2.5">
        <ColumnHeader count={atRisk.length} label="▲ At risk" />
        {atRisk.length === 0
          ? empty("No one is at risk right now.")
          : atRisk.map((member) => (
              <article
                className="flex flex-col gap-2.5 rounded-[16px] border-l-[5px] border-danger bg-badge p-4 text-white"
                key={member.profileId}
              >
                <div className="flex items-center justify-between gap-3">
                  <NameButton className="text-white" member={member} onOpen={onOpenProfile} />
                  <span className="text-[30px] leading-none font-extrabold tracking-[-0.03em]">
                    {member.readiness ?? "—"}
                  </span>
                </div>
                <span className="font-mono text-xs text-on-blue-muted uppercase">{metaLine(member)}</span>
                <ul aria-label="Career gates" className="flex gap-[5px]">
                  {member.gates.map((gate) => (
                    <li key={gate.id}>
                      <Stamp label={`${gate.label}: ${gate.state === "none" ? "not yet" : gate.state}`} onDark size={20} state={gate.state} />
                    </li>
                  ))}
                </ul>
                {member.reason ? <p className="text-sm leading-[1.4] text-on-blue">{member.reason}</p> : null}
                <TeamActionLink
                  className="self-start"
                  member={member}
                  onDark
                  onOpenProfile={onOpenProfile}
                  readinessAvailable={readinessAvailable}
                />
              </article>
            ))}
      </section>

      <section aria-label="Waiting on you" className="flex flex-col gap-2.5">
        <ColumnHeader count={waiting.length} label="● Waiting on you" />
        {waiting.length === 0
          ? empty("Nothing is waiting on you.")
          : waiting.map((member) => (
              <article
                className="grid grid-cols-[8px_minmax(0,1fr)] overflow-hidden rounded-[14px] border-[1.5px] border-ink bg-white"
                key={member.profileId}
              >
                <span aria-hidden className="bg-blue" />
                <div className="flex flex-col gap-2 px-4 py-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <NameButton className="text-ink" member={member} onOpen={onOpenProfile} />
                    <span className="text-[30px] leading-none font-extrabold tracking-[-0.03em] text-blue">
                      {member.readiness ?? "—"}
                    </span>
                  </div>
                  <span className="label-mono">{metaLine(member)}</span>
                  {member.reason ? <p className="text-sm text-ink-2">{member.reason}</p> : null}
                  <TeamActionLink
                    className="self-start"
                    member={member}
                    onOpenProfile={onOpenProfile}
                    readinessAvailable={readinessAvailable}
                  />
                </div>
              </article>
            ))}
      </section>

      <section aria-label="On track" className="flex flex-col gap-2.5">
        <ColumnHeader count={onTrack.length} label="✓ On track" />
        {onTrack.length === 0 ? (
          empty("No one is on track yet.")
        ) : (
          <>
            <ul className="overflow-hidden rounded-[14px] border border-line bg-white">
              {onTrack.map((member) => (
                <li
                  className="flex items-center justify-between gap-3 border-b border-divider px-4 py-3 text-[15px] last:border-b-0"
                  key={member.profileId}
                >
                  <button
                    className="text-left font-bold text-ink hover:underline"
                    onClick={() => onOpenProfile(member.profileId)}
                    type="button"
                  >
                    {member.fullName}
                  </button>
                  <span className="text-xl font-extrabold tracking-[-0.03em] text-ink">{member.readiness ?? "—"}</span>
                </li>
              ))}
            </ul>
            <p className="text-[13px] text-muted">
              On-track SEs collapse to rows, so the at-risk and waiting columns get the attention.
            </p>
          </>
        )}
      </section>
    </div>
  );
}

const TABLE_GRID = "grid grid-cols-[minmax(0,1.4fr)_150px_70px_90px_80px_minmax(0,2fr)_130px] gap-4";

function RosterTable({
  members,
  onOpenProfile,
  readinessAvailable,
}: {
  members: TeamMember[];
  onOpenProfile: (id: string) => void;
  readinessAvailable: boolean;
}) {
  const [sort, setSort] = useState<SortKey>("urgency");
  const sorted = useMemo(() => {
    if (sort === "name") return [...members].sort((a, b) => a.fullName.localeCompare(b.fullName));
    if (sort === "readiness") return [...members].sort((a, b) => (b.readiness ?? -1) - (a.readiness ?? -1));
    return members;
  }, [members, sort]);

  const sortButton = (key: SortKey, label: string) => (
    <button
      aria-label={`Sort by ${label.toLowerCase()}`}
      className={cn("uppercase hover:underline", sort === key && "text-signal")}
      onClick={() => setSort(key)}
      type="button"
    >
      {label}
      {sort === key ? " ↓" : ""}
    </button>
  );

  return (
    <div className="px-[var(--gutter)] pt-[18px] pb-7">
      <div className="overflow-hidden rounded-[14px] border border-line bg-white">
        <div className="overflow-x-auto">
          <div aria-label="Team roster" className="min-w-[900px]" role="table">
            <div className={cn(TABLE_GRID, "bg-blue px-5 py-[11px] font-mono text-xs text-white uppercase")} role="row">
              <span aria-sort={sort === "name" ? "ascending" : "none"} role="columnheader">
                {sortButton("name", "SE")}
              </span>
              <span aria-sort={sort === "urgency" ? "other" : "none"} role="columnheader">
                {sortButton("urgency", "Status")}
              </span>
              <span aria-sort={sort === "readiness" ? "descending" : "none"} role="columnheader">
                {sortButton("readiness", "Ready")}
              </span>
              <span role="columnheader">Ramp</span>
              <span role="columnheader">Gates</span>
              <span role="columnheader">Why</span>
              <span className="text-right" role="columnheader">
                Next action
              </span>
            </div>
            {sorted.map((member) => (
              <div
                className={cn(TABLE_GRID, "items-center border-b border-divider px-5 py-[13px] text-[15px] last:border-b-0")}
                key={member.profileId}
                role="row"
              >
                <span className="flex min-w-0 flex-col" role="cell">
                  <button
                    className="truncate text-left font-bold text-ink hover:underline"
                    onClick={() => onOpenProfile(member.profileId)}
                    type="button"
                  >
                    {member.fullName}
                  </button>
                  <span className="label-mono">{member.level}</span>
                </span>
                <span role="cell">
                  <TeamStatusTag status={member.status} />
                </span>
                <span className="text-[22px] font-extrabold tracking-[-0.03em] text-ink" role="cell">
                  {member.readiness ?? "—"}
                </span>
                <span className="font-mono text-xs text-ink-2" role="cell">
                  {member.rampTotal > 0 ? `${member.rampDone}/${member.rampTotal}` : "—"}
                </span>
                <span className="font-mono text-xs text-ink-2" role="cell">
                  {member.gatesCleared}/{member.gates.length}
                </span>
                <span className="text-ink-2" role="cell">
                  {member.reason ?? <span className="text-muted">Nothing needed</span>}
                </span>
                <span className="text-right" role="cell">
                  <TeamActionLink
                    member={member}
                    onOpenProfile={onOpenProfile}
                    readinessAvailable={readinessAvailable}
                  />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Team › Roster: one roster, two views (TABLE | BY STATUS). Every name opens the SE detail drawer. */
export function ManagerTeamRoster({
  members,
  onSelectProfile,
  readinessAvailable,
}: {
  members: TeamMember[];
  onSelectProfile: (profileId: string) => void;
  readinessAvailable: boolean;
}) {
  const [view, setView] = useState<View>("status");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
      if (stored === "table" || stored === "status") setView(stored);
    } catch {
      // storage unavailable; keep the default view
    }
  }, []);

  const changeView = (next: string) => {
    const value = next === "table" ? "table" : "status";
    setView(value);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, value);
    } catch {
      // ignore
    }
  };

  return (
    <>
      <PageHeader
        actions={
          <SegmentedToggle
            label="Roster view"
            onChange={changeView}
            options={[
              { id: "table", label: "Table" },
              { id: "status", label: "By status" },
            ]}
            value={view}
          />
        }
        className="pb-3.5"
        eyebrow={levelSummary(members)}
        title="Team"
      />
      {members.length === 0 ? (
        <p className="mx-[var(--gutter)] rounded-[14px] border border-line bg-white px-5 py-10 text-center text-[15px] text-muted">
          No one reports to you yet.
        </p>
      ) : view === "table" ? (
        <RosterTable members={members} onOpenProfile={onSelectProfile} readinessAvailable={readinessAvailable} />
      ) : (
        <StatusColumns members={members} onOpenProfile={onSelectProfile} readinessAvailable={readinessAvailable} />
      )}
    </>
  );
}
