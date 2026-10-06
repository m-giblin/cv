"use client";

import { format } from "date-fns";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { HeaderStat, TeamActionLink, TeamStatusTag, initialsOf } from "@/components/manager/team-member-bits";
import { DefinitionCard, Note } from "@/components/ui/editorial";
import { MainWithRail, PageBody, PageHeader } from "@/components/ui/page-header";
import { StatStrip } from "@/components/ui/stat";
import { PersonCell, TableCard, rowHighlight, tdCls, thCls } from "@/components/ui/table";
import type { CoachingCadenceRow } from "@/lib/manager/coaching-cadence";
import { numberWord, plural } from "@/lib/manager/copy";
import { managerSectionHref } from "@/lib/manager/manager-routes";
import { buildSinceFridayNote } from "@/lib/manager/since-note";
import { AT_RISK_READINESS, READINESS_TARGET, type TeamMember } from "@/lib/manager/team-status";
import type { ActivityLog } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Rows shown on Today; the full list lives on Team › Roster. */
const TODAY_ROWS = 6;
/** A reviewed coaching card within this many days counts as coached this week. */
const COACHED_WITHIN_DAYS = 6;

function greeting(hour: number) {
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

function accentFor(atRisk: number, reviewCount: number) {
  if (atRisk > 0) return `${numberWord(atRisk, true)} ${plural(atRisk, "person needs", "people need")} you first.`;
  if (reviewCount > 0) return "Start with the inbox.";
  return "All clear today.";
}

function readinessTone(value: number | null) {
  if (value === null) return "text-muted";
  if (value < AT_RISK_READINESS) return "text-danger";
  return "text-ink";
}

/** Manager › Today (7b): stat strip, the team by urgency, the coaching definition card and "Since Friday". */
export function ManagerToday({
  managerFirstName,
  members,
  reviewCount,
  reviewsOverSla,
  readinessAvailable,
  cadenceRows,
  activity,
  onOpenProfile,
}: {
  managerFirstName?: string;
  members: TeamMember[];
  reviewCount: number;
  reviewsOverSla: number;
  readinessAvailable: boolean;
  cadenceRows: CoachingCadenceRow[];
  activity: ActivityLog[];
  onOpenProfile: (profileId: string) => void;
}) {
  // Date and greeting depend on the viewer's clock, so they render after mount (no hydration mismatch).
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  const atRisk = members.filter((member) => member.status === "at_risk").length;
  const scored = members.map((member) => member.readiness).filter((value): value is number => value !== null);
  const avgReadiness = scored.length ? Math.round(scored.reduce((sum, value) => sum + value, 0) / scored.length) : null;
  const shown = members.slice(0, TODAY_ROWS);

  const coached = cadenceRows.filter(
    (row) => row.daysSinceCoaching !== null && row.daysSinceCoaching <= COACHED_WITHIN_DAYS,
  ).length;
  const teamSize = cadenceRows.length;

  const since = useMemo(() => (now ? buildSinceFridayNote(activity, members, now) : []), [activity, members, now]);

  return (
    <>
      <PageHeader
        accent={accentFor(atRisk, reviewCount)}
        className="pb-[22px]"
        eyebrow={now ? format(now, "EEEE, MMMM d") : "Today"}
        title={`${now ? greeting(now.getHours()) : "Hello"}${managerFirstName ? `, ${managerFirstName}.` : "."}`}
      />

      <PageBody className="flex flex-col gap-[22px] pb-7">
        <StatStrip
          action={
            <Link className="btn-primary inline-flex whitespace-nowrap no-underline" href={managerSectionHref("inbox")}>
              Open inbox
            </Link>
          }
          className="items-end"
        >
          <HeaderStat
            label="Reviews waiting"
            note={reviewsOverSla > 0 ? `${reviewsOverSla} older than 3 days` : undefined}
            value={reviewCount}
          />
          <HeaderStat label="At risk" tone={atRisk > 0 ? "danger" : "blue"} value={atRisk} />
          <HeaderStat label="Avg readiness" value={avgReadiness ?? "—"} />
        </StatStrip>

        <MainWithRail
          rail={
            <>
              <DefinitionCard
                inner={
                  teamSize > 0 ? (
                    <div aria-hidden className="flex gap-1">
                      {cadenceRows.map((row, index) => (
                        <span
                          className={cn("h-2 flex-1 rounded-[2px]", index < coached ? "bg-signal" : "bg-[#2A3A63]")}
                          key={row.profileId}
                        />
                      ))}
                    </div>
                  ) : null
                }
                link={
                  <Link className="link text-[15px]" href={managerSectionHref("cadence")}>
                    {coached < teamSize ? "Book the rest" : "See your cadence"}
                  </Link>
                }
                partOfSpeech="noun, manager"
                word="coaching"
              >
                Fifteen minutes a week per person beats an hour a month.{" "}
                {teamSize > 0
                  ? `In the last seven days you have coached ${coached} of ${teamSize} ${plural(teamSize, "person", "people")}.`
                  : "Coaching shows up here once people report to you."}
              </DefinitionCard>
              <Note title="Since Friday">
                {since.length > 0 ? since.join(" ") : "A quiet few days. No new practice or ramp activity from your team."}
              </Note>
            </>
          }
        >
          <section aria-labelledby="today-team" className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-xl font-extrabold text-ink" id="today-team">
                Your team, most urgent first
              </h2>
              {members.length > shown.length ? (
                <Link className="link text-sm" href={managerSectionHref("roster")}>
                  See all {members.length}
                </Link>
              ) : null}
            </div>
            <TableCard minWidth={720}>
              <caption className="sr-only">Your team, most urgent first. Target readiness is {READINESS_TARGET}.</caption>
              <thead>
                <tr>
                  <th className={thCls} scope="col">
                    SE
                  </th>
                  <th className={cn(thCls, "w-[150px]")} scope="col">
                    Status
                  </th>
                  <th className={cn(thCls, "w-[76px]")} scope="col">
                    Ready
                  </th>
                  <th className={thCls} scope="col">
                    Why
                  </th>
                  <th className={cn(thCls, "w-[160px] text-right")} scope="col">
                    Next
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.length === 0 ? (
                  <tr>
                    <td className={cn(tdCls, "py-10 text-center text-muted")} colSpan={5}>
                      No one reports to you yet. SEs appear here once they are assigned to you.
                    </td>
                  </tr>
                ) : (
                  shown.map((member) => (
                    <tr className={member.status === "at_risk" ? rowHighlight.danger : undefined} key={member.profileId}>
                      <td className={cn(tdCls, "py-3")}>
                        <button
                          className="block max-w-full cursor-pointer rounded-[8px] text-left"
                          onClick={() => onOpenProfile(member.profileId)}
                          type="button"
                        >
                          <PersonCell initials={initialsOf(member.fullName)} name={member.fullName} subline={member.subline} />
                        </button>
                      </td>
                      <td className={cn(tdCls, "py-3")}>
                        <TeamStatusTag status={member.status} />
                      </td>
                      <td className={cn(tdCls, "py-3")}>
                        <span
                          className={cn(
                            "num text-[22px] font-extrabold tracking-[-0.02em]",
                            readinessTone(member.readiness),
                          )}
                        >
                          {member.readiness ?? "—"}
                        </span>
                      </td>
                      <td className={cn(tdCls, "py-3 text-sm text-ink-2")}>
                        {member.reason ?? <span className="text-muted">Nothing needed</span>}
                      </td>
                      <td className={cn(tdCls, "py-3 text-right")}>
                        <TeamActionLink
                          member={member}
                          onOpenProfile={onOpenProfile}
                          readinessAvailable={readinessAvailable}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </TableCard>
          </section>
        </MainWithRail>
      </PageBody>
    </>
  );
}
