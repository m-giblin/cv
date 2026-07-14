"use client";

import { useState } from "react";
import { MentorReviewPanel } from "@/components/manager/mentor-review-panel";
import { ManagerOutlineBtn } from "@/components/manager/manager-ui-primitives";
import { MentorCoachingNotesEditor } from "@/components/manager/mentor-coaching-notes-editor";
import { Button } from "@/components/ui/button";
import type { MenteeAssignment } from "@/lib/data/fetch-mentor-mentees";
import { avatarGradientForId } from "@/lib/se/avatar-gradients";
import { initials } from "@/lib/utils";

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

export function ManagerMenteesPanel({
  mentees,
}: {
  mentees: MenteeAssignment[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <>
      {mentees.length === 0 ? (
        <div className="border border-[#E2DFD9] bg-white p-6">
          <p className="text-sm text-[#6B6860]">
            No active mentee assignments yet. Your manager will assign you when onboarding plans are
            created.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="border border-[#E2DFD9] bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#A09D98]">Active mentees</p>
              <p className="font-display text-2xl font-extrabold text-[#0D0E12]">{mentees.length}</p>
            </div>
            <div className="border border-[#E2DFD9] bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#A09D98]">Check-ins pending</p>
              <p className="font-display text-2xl font-extrabold text-[#b45309]">
                {mentees.reduce((sum, item) => sum + item.pendingMentorReviews, 0)}
              </p>
            </div>
            <div className="border border-[#E2DFD9] bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#A09D98]">Awaiting manager sign-off</p>
              <p className="font-display text-2xl font-extrabold text-[#0071ce]">
                {mentees.reduce((sum, item) => sum + item.awaitingManagerSignoff, 0)}
              </p>
            </div>
          </div>

          <MentorReviewPanel />

          {mentees.map(({ plan, profile, pendingMentorReviews, awaitingManagerSignoff }) => {
            const isOpen = expandedId === profile.id;
            const nextStep = plan.steps
              .filter((step) => step.status !== "reviewed")
              .sort((a, b) => a.order - b.order)[0];

            return (
              <div className="border border-[#E2DFD9] bg-white" key={profile.id}>
                <div className="flex flex-wrap items-center gap-3 p-4">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ background: avatarGradientForId(profile.id) }}
                  >
                    {initials(profile.fullName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#0D0E12]">{profile.fullName}</p>
                    <p className="text-xs text-[#6B6860]">
                      {plan.name} · {formatPercent(plan.progress)} complete
                    </p>
                  </div>
                  {pendingMentorReviews > 0 ? (
                    <span className="rounded-full bg-[#fef3c7] px-2 py-0.5 text-[10px] font-bold text-[#b45309]">
                      {pendingMentorReviews} check-in{pendingMentorReviews === 1 ? "" : "s"}
                    </span>
                  ) : null}
                  {awaitingManagerSignoff > 0 ? (
                    <span className="rounded-full bg-[#e8f2fc] px-2 py-0.5 text-[10px] font-bold text-[#0071ce]">
                      Manager sign-off pending
                    </span>
                  ) : null}
                  <Button onClick={() => setExpandedId(isOpen ? null : profile.id)} size="sm" variant="outline">
                    {isOpen ? "Close" : "Coach"}
                  </Button>
                </div>

                {isOpen ? (
                  <div className="space-y-4 border-t border-[#ECEAE6] p-4">
                    {nextStep ? (
                      <p className="text-xs text-[#6B6860]">
                        Next step: <span className="font-semibold text-[#3D3C38]">{nextStep.title}</span> (
                        {nextStep.status.replaceAll("_", " ")})
                      </p>
                    ) : null}
                    <div className="grid gap-2 sm:grid-cols-2">
                      {plan.steps.slice(0, 8).map((step) => (
                        <div className="border border-[#ECEAE6] bg-[#F9F8F6] px-3 py-2 text-xs" key={step.id}>
                          <p className="font-semibold text-[#3D3C38]">{step.title}</p>
                          <p className="capitalize text-[#6B6860]">{step.status.replaceAll("_", " ")}</p>
                        </div>
                      ))}
                    </div>
                    <MentorCoachingNotesEditor seUserId={profile.id} />
                    <div className="flex flex-wrap gap-2">
                      {nextStep?.assignmentStepId ? (
                        <ManagerOutlineBtn href={`/plan-steps/${nextStep.assignmentStepId}`}>
                          Open current step →
                        </ManagerOutlineBtn>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
