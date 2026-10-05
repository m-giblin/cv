"use client";

import { toast } from "sonner";
import { ManagerCoachingQualityPanel } from "@/components/manager/manager-coaching-quality-panel";
import { HeaderStat } from "@/components/manager/team-member-bits";
import { PageHeader } from "@/components/ui/page-header";
import { Tag } from "@/components/ui/tag";
import type { CoachingCadenceRow } from "@/lib/manager/coaching-cadence";
import { downloadOneOnOneIcs } from "@/lib/manager/one-on-one-ics";
import type { SeCoachingSummary } from "@/lib/manager/se-coaching-summary";
import type { Profile } from "@/lib/types";
import { uniqueProfiles } from "@/lib/utils";

const PRIORITY_TAG: Record<CoachingCadenceRow["priority"], { label: string; tone: "danger" | "warning" | "success" }> = {
  urgent: { label: "▲ Urgent", tone: "danger" },
  attention: { label: "• Attention", tone: "warning" },
  healthy: { label: "✓ Healthy", tone: "success" },
};

function lastCoached(days: number | null) {
  if (days === null) return "Never";
  if (days === 0) return "Today";
  return `${days}d ago`;
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
        actions={
          <div className="flex gap-8">
            <HeaderStat label="Urgent" tone={urgent > 0 ? "danger" : "blue"} value={urgent} />
            <HeaderStat label="Needs attention" value={attention} />
          </div>
        }
        eyebrow={`Coaching rhythm · ${cadenceRows.length} SE${cadenceRows.length === 1 ? "" : "s"} · 14-day cadence`}
        title="Coaching"
      />
      <div className="flex flex-col gap-7 px-[var(--gutter)] pb-8">
        <div className="overflow-x-auto rounded-[14px] border border-line bg-white">
          <table className="w-full min-w-[760px] border-collapse text-left text-[15px]">
            <caption className="sr-only">Coaching cadence, most urgent first</caption>
            <thead className="bg-blue font-mono text-xs text-white uppercase">
              <tr>
                <th className="px-5 py-[11px] font-medium" scope="col">SE</th>
                <th className="px-5 py-[11px] font-medium" scope="col">Priority</th>
                <th className="px-5 py-[11px] font-medium" scope="col">Last coached</th>
                <th className="px-5 py-[11px] font-medium" scope="col">Open reviews</th>
                <th className="px-5 py-[11px] font-medium" scope="col">Focus</th>
                <th className="px-5 py-[11px] text-right font-medium" scope="col">Next action</th>
              </tr>
            </thead>
            <tbody>
              {cadenceRows.length === 0 ? (
                <tr>
                  <td className="px-5 py-10 text-center text-muted" colSpan={6}>
                    No one reports to you yet.
                  </td>
                </tr>
              ) : (
                cadenceRows.map((row) => {
                  const coaching = coachingByUser[row.profileId];
                  const profile = profileById.get(row.profileId);
                  const tag = PRIORITY_TAG[row.priority];
                  return (
                    <tr className="border-b border-divider last:border-b-0" key={row.profileId}>
                      <th className="px-5 py-3 text-left" scope="row">
                        <button
                          className="font-bold text-ink hover:underline"
                          onClick={() => onOpenProfile?.(row.profileId)}
                          type="button"
                        >
                          {row.fullName}
                        </button>
                      </th>
                      <td className="px-5 py-3">
                        <Tag className="bg-transparent" tone={tag.tone}>
                          {tag.label}
                        </Tag>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-ink-2 uppercase">
                        {lastCoached(row.daysSinceCoaching)}
                      </td>
                      <td className="px-5 py-3 text-xl font-extrabold tracking-[-0.03em] text-ink">
                        {row.openReviews || "—"}
                      </td>
                      <td className="px-5 py-3 text-ink-2">
                        {coaching?.topGaps[0] ?? coaching?.currentFocus ?? <span className="text-muted">—</span>}
                      </td>
                      <td className="px-5 py-3 text-right">
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
          </table>
        </div>
        <p className="-mt-4 text-[13px] text-muted">
          Last coached is the most recent coaching card you reviewed. Over 14 days needs attention; over 21 days or any
          open review is urgent.
        </p>

        <section className="flex flex-col gap-3 rounded-[14px] border border-line bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-extrabold text-ink">Coaching quality · 30 days</h2>
            <p className="text-sm text-ink-2">Structured sign-off patterns. Flags fast rubber-stamping and cadence gaps.</p>
          </div>
          <ManagerCoachingQualityPanel orgIds={uniqueProfiles(org).map((profile) => profile.id)} />
        </section>
      </div>
    </>
  );
}
