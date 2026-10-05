"use client";

import { format } from "date-fns";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { HeaderStat, TeamActionLink, TeamStatusTag } from "@/components/manager/team-member-bits";
import { managerSectionHref } from "@/lib/manager/manager-routes";
import type { TeamMember } from "@/lib/manager/team-status";
import { cn } from "@/lib/utils";

const GRID = "grid grid-cols-[6px_200px_150px_70px_minmax(0,1fr)_140px] gap-4";

function greeting(hour: number) {
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

/** Manager › Today: three stats, one primary ("Open inbox"), and one row per SE ranked by urgency. */
export function ManagerToday({
  managerFirstName,
  members,
  reviewCount,
  reviewsOverSla,
  readinessAvailable,
  onOpenProfile,
}: {
  managerFirstName?: string;
  members: TeamMember[];
  reviewCount: number;
  reviewsOverSla: number;
  readinessAvailable: boolean;
  onOpenProfile: (profileId: string) => void;
}) {
  // Date and greeting depend on the viewer's clock, so they render after mount (no hydration mismatch).
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  const atRisk = members.filter((member) => member.status === "at_risk").length;
  const scored = members.map((member) => member.readiness).filter((value): value is number => value !== null);
  const avgReadiness = scored.length ? Math.round(scored.reduce((sum, value) => sum + value, 0) / scored.length) : null;

  return (
    <>
      <PageHeader
        actions={
          <div className="flex flex-wrap items-end gap-8">
            <HeaderStat
              label="Reviews waiting"
              note={reviewsOverSla > 0 ? `${reviewsOverSla} over 3d` : undefined}
              value={reviewCount}
            />
            <HeaderStat label="At risk" tone={atRisk > 0 ? "danger" : "blue"} value={atRisk} />
            <HeaderStat label="Avg readiness" value={avgReadiness ?? "—"} />
            <Link className="btn-primary whitespace-nowrap" href={managerSectionHref("inbox")}>
              Open inbox
            </Link>
          </div>
        }
        className="pb-5"
        eyebrow={`${now ? `${format(now, "EEE dd MMM")} · ` : ""}${members.length} SE${members.length === 1 ? "" : "s"}`}
        title={`${now ? greeting(now.getHours()) : "Hello"}${managerFirstName ? `, ${managerFirstName}.` : "."}`}
      />

      <div className="px-[var(--gutter)] pb-7">
        <div className="overflow-hidden rounded-[14px] border border-line bg-white">
          <div className="overflow-x-auto">
            <div className="min-w-[760px]" role="table" aria-label="Team by urgency">
              <div
                className={cn(GRID, "bg-blue py-[11px] pr-5 font-mono text-xs text-white uppercase")}
                role="row"
              >
                <span aria-hidden />
                <span role="columnheader">SE · by urgency</span>
                <span role="columnheader">Status</span>
                <span role="columnheader">Ready</span>
                <span role="columnheader">Why</span>
                <span className="text-right" role="columnheader">
                  Next action
                </span>
              </div>
              {members.length === 0 ? (
                <p className="px-5 py-10 text-center text-[15px] text-muted">
                  No one reports to you yet. SEs appear here once they are assigned to you.
                </p>
              ) : (
                members.map((member) => (
                  <div
                    className={cn(GRID, "items-center border-b border-divider py-[13px] pr-5 text-[15px] last:border-b-0")}
                    key={member.profileId}
                    role="row"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "self-stretch rounded-r-[3px]",
                        member.status === "at_risk" ? "bg-danger" : "bg-transparent",
                      )}
                    />
                    <span role="cell">
                      <button
                        className="text-left font-bold text-ink hover:underline"
                        onClick={() => onOpenProfile(member.profileId)}
                        type="button"
                      >
                        {member.fullName}
                      </button>
                    </span>
                    <span role="cell">
                      <TeamStatusTag status={member.status} />
                    </span>
                    <span className="text-[22px] font-extrabold tracking-[-0.03em] text-ink" role="cell">
                      {member.readiness ?? "—"}
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
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
