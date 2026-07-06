"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DealPrepManagerStat } from "@/lib/data/get-deal-prep-manager-stats";
import type { Profile } from "@/lib/types";
import { meetingTypeLabel } from "@/lib/deal-prep/templates";

export function ManagerDealPrepPanel({
  stats,
  sharedSessions,
  org,
}: {
  stats: DealPrepManagerStat[];
  sharedSessions: {
    id: string;
    user_id: string;
    account_name: string;
    industry: string;
    created_at: string;
    version_number: number;
    meeting_type: string | null;
  }[];
  org: Profile[];
}) {
  const totalPreps = stats.reduce((sum, row) => sum + row.prepCountThisWeek, 0);
  const activeSes = stats.filter((row) => row.prepCountThisWeek > 0).length;

  if (totalPreps === 0 && sharedSessions.length === 0) {
    return null;
  }

  function personName(userId: string) {
    return org.find((profile) => profile.id === userId)?.fullName ?? "Team member";
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-sp-magenta" />
          Deal prep activity
        </CardTitle>
        <CardDescription>
          {activeSes > 0
            ? `${activeSes} SE${activeSes === 1 ? "" : "s"} prepped ${totalPreps} account${totalPreps === 1 ? "" : "s"} this week.`
            : "No deal prep activity this week yet."}
        </CardDescription>
      </CardHeader>

      {stats.length > 0 ? (
        <ul className="space-y-2 px-6 pb-4 text-sm">
          {stats.map((row) => (
            <li className="flex items-center justify-between gap-3" key={row.userId}>
              <span className="font-medium text-sp-navy">{personName(row.userId)}</span>
              <span className="text-sp-navy-muted">
                {row.prepCountThisWeek} prep{row.prepCountThisWeek === 1 ? "" : "s"}
                {row.latestAccount ? ` · latest ${row.latestAccount}` : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {sharedSessions.length > 0 ? (
        <div className="border-t border-sp-blue/10 px-6 py-4">
          <p className="text-xs font-bold uppercase tracking-wide text-sp-navy-muted">Shared for your review</p>
          <ul className="mt-2 space-y-2">
            {sharedSessions.map((session) => (
              <li key={session.id}>
                <Link
                  className="block rounded-lg border border-sp-blue/10 px-3 py-2 text-sm hover:bg-sp-blue-soft/20"
                  href={`/prep?session=${session.id}`}
                >
                  <p className="font-semibold text-sp-navy">
                    {session.account_name} · {personName(session.user_id)}
                  </p>
                  <p className="text-xs text-sp-navy-muted">
                    {session.industry} · v{session.version_number} · {meetingTypeLabel(session.meeting_type)} ·{" "}
                    {new Date(session.created_at).toLocaleDateString()}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
