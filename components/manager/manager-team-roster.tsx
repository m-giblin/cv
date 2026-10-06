"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { TeamActionLink, TeamStatusTag, initialsOf } from "@/components/manager/team-member-bits";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { Stamp } from "@/components/ui/stamp";
import { PersonCell, TableCard, rowHighlight, tdCls, thCls } from "@/components/ui/table";
import { ageWords, numberWord, plural, sentence } from "@/lib/manager/copy";
import { AT_RISK_READINESS, type TeamGate, type TeamMember, type TeamStatus } from "@/lib/manager/team-status";
import { cn } from "@/lib/utils";

type View = "table" | "status";
type SortKey = "urgency" | "name" | "readiness";

const VIEW_STORAGE_KEY = "manager-roster-view";

const STAMP_WORD: Record<TeamGate["state"], string> = {
  earned: "cleared",
  ready: "ready to sign off",
  partial: "in progress",
  none: "not yet",
};

function PersonButton({ member, onOpen, subline }: { member: TeamMember; onOpen: (id: string) => void; subline?: string }) {
  return (
    <button
      aria-label={`Open ${member.fullName}`}
      className="block min-w-0 cursor-pointer rounded-[8px] text-left"
      onClick={() => onOpen(member.profileId)}
      type="button"
    >
      <PersonCell initials={initialsOf(member.fullName)} name={member.fullName} subline={subline ?? member.subline} />
    </button>
  );
}

function ColumnHeader({ label, count, tone }: { label: string; count: number; tone: "danger" | "warning" | "success" }) {
  const border = { danger: "border-danger", warning: "border-warning", success: "border-success" }[tone];
  const text = { danger: "text-danger", warning: "text-warning", success: "text-success" }[tone];
  return (
    <h2 className={cn("flex items-center justify-between border-b-2 pb-2.5", border)}>
      <span className="text-base font-extrabold text-ink">{label}</span>
      <span className={cn("num text-sm font-bold", text)}>{count}</span>
    </h2>
  );
}

function GateStamps({ gates }: { gates: TeamGate[] }) {
  return (
    <ul aria-label="Career gates" className="flex gap-1.5">
      {gates.map((gate) => (
        <li className="flex flex-1 justify-center" key={gate.id} title={`${gate.label}: ${STAMP_WORD[gate.state]}`}>
          <Stamp label={`${gate.label}: ${STAMP_WORD[gate.state]}`} size={20} state={gate.state} />
        </li>
      ))}
    </ul>
  );
}

function pendingSubline(member: TeamMember) {
  const pending = member.pending;
  if (!pending) return member.subline;
  return pending.count > 1 ? `${pending.title} and ${pending.count - 1} more` : pending.title;
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
    <p className="rounded-[14px] border border-dashed border-line-strong px-[18px] py-4 text-sm text-muted">{text}</p>
  );

  return (
    <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-3">
      <section aria-label="At risk" className="flex flex-col gap-3.5">
        <ColumnHeader count={atRisk.length} label="At risk" tone="danger" />
        {atRisk.length === 0
          ? empty("No one is at risk right now.")
          : atRisk.map((member) => (
              <article
                className="flex flex-col gap-3 rounded-[14px] border border-line bg-white px-[18px] py-4 shadow-[inset_3px_0_0_var(--color-danger)]"
                key={member.profileId}
              >
                <PersonButton member={member} onOpen={onOpenProfile} />
                <GateStamps gates={member.gates} />
                {member.reason ? <p className="text-sm leading-normal text-ink-2">{sentence(member.reason)}</p> : null}
                <TeamActionLink
                  className="self-start"
                  member={member}
                  onOpenProfile={onOpenProfile}
                  readinessAvailable={readinessAvailable}
                />
              </article>
            ))}
      </section>

      <section aria-label="Waiting on you" className="flex flex-col gap-3.5">
        <ColumnHeader count={waiting.length} label="Waiting on you" tone="warning" />
        {waiting.length === 0
          ? empty("Nothing is waiting on you.")
          : waiting.map((member) => (
              <article className="rounded-[14px] border border-line bg-white px-[18px] py-3.5" key={member.profileId}>
                <div className="flex items-start justify-between gap-3">
                  <PersonButton member={member} onOpen={onOpenProfile} subline={pendingSubline(member)} />
                  <span
                    aria-label={member.readiness === null ? "No readiness score yet" : `Readiness ${member.readiness}`}
                    className="num text-[26px] leading-none font-extrabold text-blue"
                  >
                    {member.readiness ?? "—"}
                  </span>
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-3">
                  <span className="text-[13px] text-muted">
                    {member.pending?.ageDays != null ? ageWords(member.pending.ageDays) : "Waiting"}
                  </span>
                  <TeamActionLink member={member} onOpenProfile={onOpenProfile} readinessAvailable={readinessAvailable} />
                </div>
              </article>
            ))}
      </section>

      <section aria-label="On track" className="flex flex-col">
        <ColumnHeader count={onTrack.length} label="On track" tone="success" />
        {onTrack.length === 0 ? (
          <div className="pt-3.5">{empty("No one is on track yet.")}</div>
        ) : (
          <ul>
            {onTrack.map((member) => (
              <li
                className="flex items-center justify-between gap-3 border-t border-divider py-[11px] first:border-t-0"
                key={member.profileId}
              >
                <PersonButton member={member} onOpen={onOpenProfile} />
                <span className="num text-lg font-extrabold text-ink">{member.readiness ?? "—"}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="pt-3.5 text-[13px] leading-normal text-muted">
          Click anyone to open their plan, scores and coaching notes in a side panel.
        </p>
      </section>
    </div>
  );
}

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

  const sortHeader = (key: SortKey, label: string, className?: string) => (
    <th
      aria-sort={sort === key ? (key === "name" ? "ascending" : key === "readiness" ? "descending" : "other") : "none"}
      className={cn(thCls, className)}
      scope="col"
    >
      <button
        className={cn("th cursor-pointer hover:text-ink", sort === key && "text-ink")}
        onClick={() => setSort(key)}
        title={`Sort by ${label.toLowerCase()}`}
        type="button"
      >
        {label}
      </button>
    </th>
  );

  return (
    <TableCard minWidth={940}>
      <caption className="sr-only">Team roster. Click a column header to sort.</caption>
      <thead>
        <tr>
          {sortHeader("name", "SE")}
          {sortHeader("urgency", "Status", "w-[150px]")}
          {sortHeader("readiness", "Ready", "w-[80px]")}
          <th className={cn(thCls, "w-[100px]")} scope="col">
            Ramp
          </th>
          <th className={cn(thCls, "w-[90px]")} scope="col">
            Gates
          </th>
          <th className={thCls} scope="col">
            Why
          </th>
          <th className={cn(thCls, "w-[150px] text-right")} scope="col">
            Next
          </th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((member) => (
          <tr className={member.status === "at_risk" ? rowHighlight.danger : undefined} key={member.profileId}>
            <td className={cn(tdCls, "py-3")}>
              <PersonButton member={member} onOpen={onOpenProfile} />
            </td>
            <td className={tdCls}>
              <TeamStatusTag status={member.status} />
            </td>
            <td className={tdCls}>
              <span
                className={cn(
                  "num text-[22px] font-extrabold tracking-[-0.02em]",
                  member.readiness !== null && member.readiness < AT_RISK_READINESS ? "text-danger" : "text-ink",
                )}
              >
                {member.readiness ?? "—"}
              </span>
            </td>
            <td className={cn(tdCls, "text-sm text-ink-2")}>
              {member.rampTotal > 0 ? `${member.rampDone} of ${member.rampTotal}` : "No plan"}
            </td>
            <td className={cn(tdCls, "text-sm text-ink-2")}>
              {member.gatesCleared} of {member.gates.length}
            </td>
            <td className={cn(tdCls, "text-sm text-ink-2")}>
              {member.reason ?? <span className="text-muted">Nothing needed</span>}
            </td>
            <td className={cn(tdCls, "text-right")}>
              <TeamActionLink member={member} onOpenProfile={onOpenProfile} readinessAvailable={readinessAvailable} />
            </td>
          </tr>
        ))}
      </tbody>
    </TableCard>
  );
}

function rosterAccent(count: number) {
  if (count === 0) return undefined;
  return `${numberWord(count, true)} ${plural(count, "person", "people")}, three piles.`;
}

/** Team › Roster (9b): one roster, two views (Table | By status). Every name opens the SE detail drawer. */
export function ManagerTeamRoster({
  members,
  onSelectProfile,
  readinessAvailable,
  tabs,
}: {
  members: TeamMember[];
  onSelectProfile: (profileId: string) => void;
  readinessAvailable: boolean;
  tabs?: ReactNode;
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
        accent={rosterAccent(members.length)}
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
        className="pb-[22px]"
        eyebrow="Team"
        title="Your team."
      />
      {tabs}
      <PageBody className="pb-7">
        {members.length === 0 ? (
          <p className="rounded-[14px] border border-line bg-white px-5 py-10 text-center text-[15px] text-muted">
            No one reports to you yet.
          </p>
        ) : view === "table" ? (
          <RosterTable members={members} onOpenProfile={onSelectProfile} readinessAvailable={readinessAvailable} />
        ) : (
          <StatusColumns members={members} onOpenProfile={onSelectProfile} readinessAvailable={readinessAvailable} />
        )}
      </PageBody>
    </>
  );
}
