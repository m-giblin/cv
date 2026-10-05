"use client";

import Link from "next/link";
import { KpiStrip, LineCard } from "@/components/admin/admin-ui";
import type { PendingReviewBreakdown } from "@/lib/data/get-pending-review-breakdown";

export function AdminReviewsPanel({
  pendingReviewBreakdown,
}: {
  pendingReviewBreakdown: PendingReviewBreakdown;
}) {
  const items = [
    {
      label: "Challenge submissions",
      count: pendingReviewBreakdown.challengeSubmissions,
      href: "/manager/inbox",
      description: "Field scenario evidence awaiting manager or admin review.",
    },
    {
      label: "Simulation coaching cards",
      count: pendingReviewBreakdown.simulationCards,
      href: "/manager/inbox",
      description: "AI roleplay sessions pending manager feedback.",
    },
    {
      label: "Plan step reviews",
      count: pendingReviewBreakdown.planStepReviews,
      href: "/manager/inbox",
      description: "Onboarding plan steps submitted for sign-off.",
    },
    {
      label: "Certification sign-offs",
      count: pendingReviewBreakdown.certSignoffs,
      href: "/manager/inbox",
      description: "Readiness certification gates awaiting approval.",
    },
  ];

  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="flex flex-col gap-6">
      <KpiStrip items={items.map((item) => ({ label: item.label, value: item.count }))} />

      <LineCard bodyClassName="p-0" meta={`${total} pending`} title="Review queues">
        <ul>
          {items.map((item) => (
            <li
              className="flex flex-wrap items-center justify-between gap-3 border-b border-divider px-5 py-3.5 last:border-b-0"
              key={item.label}
            >
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-ink">{item.label}</p>
                <p className="text-sm text-ink-2">{item.description}</p>
              </div>
              <div className="flex items-center gap-5">
                <span
                  className={
                    item.count > 0
                      ? "text-lg font-extrabold text-blue tabular-nums"
                      : "text-lg font-extrabold text-faint tabular-nums"
                  }
                >
                  {item.count}
                </span>
                <Link className="link text-sm" href={item.href}>
                  Open inbox
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </LineCard>
    </div>
  );
}
