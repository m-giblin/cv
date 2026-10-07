"use client";

import { toast } from "sonner";
import { ManagerCoachingQualityPanel } from "@/components/manager/manager-coaching-quality-panel";
import { HeaderStat } from "@/components/manager/team-member-bits";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { PersonCell, TableCard, rowHighlight, tdCls, thCls } from "@/components/ui/table";
import type { CoachingCadenceRow } from "@/lib/manager/coaching-cadence";
import { downloadOneOnOneIcs } from "@/lib/manager/one-on-one-ics";
import type { SeCoachingSummary } from "@/lib/manager/se-coaching-summary";
import type { Profile } from "@/lib/types";
import { cn, initials, uniqueProfiles } from "@/lib/utils";

const PRIORITY_PILL: Record<CoachingCadenceRow["priority"], { label: string; tone: StatusTone }> = {
  urgent: { label: "Urgent", tone: "danger" },
  attention: { label: "Needs attention", tone: "warning" },
  healthy: { label: "Healthy", tone: "success" },
};

function lastCoached(days: number | null) {
  if (days === null) return "Never";
  if (days === 0) return "Today";
  return days === 1 ? "1 day" : `${days} days`;
}

/** Coaching › Cadence: who is due a coaching touchpoint, from reviewed coaching cards and open reviews. */
export function ManagerCoachingCadencePanel({
  org = [],
  cadenceRows = [],
  coachingByUser = {},
  onOpenProfile,
}: {
  org?: Profile[];
  cadenceRows?: CoachingCadenceRow[];
  coachingByUser?: Record<string, SeCoachingSummary>;
  onOpenProfile?: (profileId: string) => void;
}) {
  const urgent = cadenceRows.filter((row) => row.priority === "urgent").length;
  const attention = cadenceRows.filter((row) => row.priority === "attention").length;
  const profileById = new Map(org.map((profile) => [profile.id, profile]));

  return (
    <>
      <PageHeader
        accent="Who you haven't seen lately."
        actions={
          <div className="flex gap-12">
            <HeaderStat label="Urgent" tone={urgent > 0 ? "danger" : "blue"} value={urgent} />
            <HeaderStat label="Needs attention" value={attention} />
          </div>
        }
        eyebrow="Coaching"
        subtitle={`A 14-day coaching rhythm across ${cadenceRows.length} SE${cadenceRows.length === 1 ? "" : "s"}, most urgent first.`}
        title="Cadence."
      />
      <PageBody className="flex flex-col gap-5 pb-7">
        <ManagerCoachingQualityPanel orgIds={uniqueProfiles(org).map((profile) => profile.id)} />
        <div className="flex flex-col gap-3">
          <TableCard>
            <caption className="sr-only">Coaching cadence, most urgent first</caption>
            <thead>
              <tr>
                <th className={thCls} scope="col">SE</th>
                <th className={thCls} scope="col">Status</th>
                <th className={thCls} scope="col">Last coached</th>
                <th className={cn(thCls, "text-right")} scope="col">Open reviews</th>
                <th className={thCls} scope="col">Focus</th>
                <th className={cn(thCls, "text-right")} scope="col">Next action</th>
              </tr>
            </thead>
            <tbody>
              {cadenceRows.length === 0 ? (
                <tr>
                  <td className={cn(tdCls, "py-10 text-center text-muted")} colSpan={6}>
                    No one reports to you yet.
                  </td>
                </tr>
              ) : (
                cadenceRows.map((row) => {
                  const coaching = coachingByUser[row.profileId];
                  const profile = profileById.get(row.profileId);
                  const pill = PRIORITY_PILL[row.priority];
                  const focus = coaching?.topGaps[0] ?? coaching?.currentFocus;
                  return (
                    <tr className={row.priority === "urgent" ? rowHighlight.danger : undefined} key={row.profileId}>
                      <th className={cn(tdCls, "text-left font-normal")} scope="row">
                        <PersonCell
                          initials={initials(row.fullName)}
                          name={
                            onOpenProfile ? (
                              <button
                                className="text-left font-bold text-ink hover:underline"
                                onClick={() => onOpenProfile(row.profileId)}
                                type="button"
                              >
                                {row.fullName}
                              </button>
                            ) : (
                              row.fullName
                            )
                          }
                          subline={profile?.level}
                        />
                      </th>
                      <td className={tdCls}>
                        <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
                      </td>
                      <td className={cn(tdCls, "text-ink-2")}>{lastCoached(row.daysSinceCoaching)}</td>
                      <td className={cn(tdCls, "num text-right font-bold", row.openReviews ? "text-ink" : "text-muted")}>
                        {row.openReviews}
                      </td>
                      <td className={cn(tdCls, "text-ink-2")}>
                        {focus ?? <span className="text-muted">Not set</span>}
                      </td>
                      <td className={cn(tdCls, "text-right")}>
                        <button
                          className="link text-sm"
                          onClick={() => {
                            downloadOneOnOneIcs({
                              name: row.fullName,
                              email: profile?.email ?? "",
                              level: profile?.level,
                              talkingPoints: coaching?.talkingPoints.slice(0, 4),
                            });
                            toast.success(`1:1 invite for ${row.fullName.split(" ")[0]} downloaded`);
                          }}
                          type="button"
                        >
                          Schedule 1:1
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </TableCard>
          <p className="max-w-[640px] text-[13px] text-muted">
            Last coached is the most recent coaching card you reviewed. Over 14 days needs attention; over 21 days or any
            open review is urgent.
          </p>
        </div>

      </PageBody>
    </>
  );
}
