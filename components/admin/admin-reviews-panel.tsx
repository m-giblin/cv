"use client";

import Link from "next/link";
import { AdminTabPageHeader } from "@/components/admin/admin-tab-page-header";
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
      color: "#D4810A",
      href: "/manager?section=inbox",
      description: "Field scenario evidence awaiting manager or admin review.",
    },
    {
      label: "Simulation coaching cards",
      count: pendingReviewBreakdown.simulationCards,
      color: "#7c3aed",
      href: "/manager?section=inbox",
      description: "AI roleplay sessions pending manager feedback.",
    },
    {
      label: "Plan step reviews",
      count: pendingReviewBreakdown.planStepReviews,
      color: "#0071CE",
      href: "/manager?section=inbox",
      description: "Onboarding plan steps submitted for sign-off.",
    },
    {
      label: "Certification sign-offs",
      count: pendingReviewBreakdown.certSignoffs,
      color: "#CC27B0",
      href: "/manager?section=inbox",
      description: "Readiness certification gates awaiting approval.",
    },
  ];

  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="animate-[fadeUp_0.2s_ease-out] space-y-[14px]">
      <AdminTabPageHeader
        subtitle="Central queue for submissions, simulations, plan steps, and certification gates."
        title="Reviews"
      />

      <div className="grid gap-px border border-[#E2DFD9] bg-[#E2DFD9] sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div className="bg-white p-4" key={item.label}>
            <p className="font-mono text-[9px] uppercase tracking-[.1em] text-[#B0ADA8]">{item.label}</p>
            <p className="font-mono text-[36px] leading-none" style={{ color: item.color }}>
              {item.count}
            </p>
          </div>
        ))}
      </div>

      <div className="border border-[#E2DFD9] bg-white">
        <div className="border-b border-[#ECEAE6] px-4 py-3">
          <p className="text-[12.5px] font-bold text-[#0D0E12]">
            {total} pending review{total === 1 ? "" : "s"}
          </p>
        </div>
        <div className="divide-y divide-[#ECEAE6]">
          {items.map((item) => (
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" key={item.label}>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-[#0D0E12]">{item.label}</p>
                <p className="text-[10.5px] text-[#6B6860]">{item.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className="font-mono text-[18px] font-medium"
                  style={{ color: item.count > 0 ? item.color : "#A09D98" }}
                >
                  {item.count}
                </span>
                <Link
                  className="border border-[#D4D1CB] px-3 py-1.5 text-[10px] font-semibold text-[#3D3C38] hover:border-[#0071CE] hover:text-[#0071CE]"
                  href={item.href}
                >
                  Open inbox →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
