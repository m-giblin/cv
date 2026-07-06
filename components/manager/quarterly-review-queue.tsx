"use client";

import Link from "next/link";
import { CalendarClock } from "lucide-react";
import type { DevelopmentPlan } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

export function QuarterlyReviewQueue({
  developmentPlans,
}: {
  developmentPlans: DevelopmentPlan[];
}) {
  const dueItems = developmentPlans.flatMap((plan) =>
    plan.goals.flatMap((goal) =>
      goal.quarterlyReviews
        .filter((review) => review.status === "not_started" && new Date(review.dueDate).getTime() <= Date.now() + 14 * 24 * 60 * 60 * 1000)
        .map((review) => ({
          planUserId: plan.userId,
          goalTitle: goal.title,
          quarter: review.quarter,
          dueDate: review.dueDate,
          reviewId: review.id,
          overdue: new Date(review.dueDate).getTime() < Date.now(),
        })),
    ),
  );

  if (dueItems.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-violet-700" />
        <h2 className="text-sm font-bold text-violet-950">Quarterly attestations due</h2>
        <Badge tone="magenta">{dueItems.length}</Badge>
      </div>
      <ul className="mt-3 space-y-2">
        {dueItems.slice(0, 5).map((item) => (
          <li key={item.reviewId}>
            <Link
              className="flex items-center justify-between rounded-xl border border-violet-200/80 bg-white px-3 py-2 text-sm hover:bg-violet-50"
              href={`/development?profile=${item.planUserId}&review=${item.reviewId}`}
            >
              <span className="font-medium text-sp-navy">
                {item.quarter} · {item.goalTitle}
              </span>
              <Badge tone={item.overdue ? "amber" : "blue"}>
                {item.overdue ? "Overdue" : "Due soon"}
              </Badge>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
