"use client";

import { useCallback, useMemo, useState } from "react";
import { AIReviewDrawer } from "./AIReviewDrawer";
import { ContentSubmitModal } from "./ContentSubmitModal";
import { FullPlanDrawer } from "./FullPlanDrawer";
import { mockSEProfiles } from "./data";
import { useApprovedPlans } from "./hooks/useApprovedPlans";
import { SECard } from "./SECard";
import type { SEDevProfile } from "./types";
import { downloadMilestonesICS } from "./utils/calendarSync";

function planIsActive(se: (typeof mockSEProfiles)[number], approved: Record<string, boolean>): boolean {
  const needsApproval = se.status === "NO PLAN" || se.status === "AI PLAN READY";
  return !needsApproval || !!approved[se.id];
}

function buildProfile(se: (typeof mockSEProfiles)[number], approved: Record<string, boolean>): SEDevProfile {
  const active = planIsActive(se, approved);
  return {
    ...se,
    status: active && se.status !== "ACTIVE" ? "ACTIVE" : se.status,
    hasAiSuggestion: !active && se.hasAiSuggestion,
    goals: active ? se.approvedGoals : [],
    quarters: active ? se.approvedQuarters : se.pendingQuarters,
    goalCount: active ? se.approvedGoalCount : se.pendingGoalCount,
  };
}

export function DevelopmentPlans() {
  const { approved, approvePlan, approveAll } = useApprovedPlans();
  const [aiDrawerKey, setAiDrawerKey] = useState<string | null>(null);
  const [planDrawerKey, setPlanDrawerKey] = useState<string | null>(null);
  const [contentModal, setContentModal] = useState<{ seId: string; title: string } | null>(null);
  const [toast, setToast] = useState<{ msg: string; color: string } | null>(null);

  const showToast = useCallback((msg: string, color = "#0071CE") => {
    setToast({ msg, color });
    window.setTimeout(() => setToast(null), 3000);
  }, []);

  const seProfiles = useMemo(() => mockSEProfiles.map((se) => buildProfile(se, approved)), [approved]);

  const aiDrawerSE = seProfiles.find((s) => s.id === aiDrawerKey);
  const planDrawerSE = seProfiles.find((s) => s.id === planDrawerKey);

  const handleApprovePlan = useCallback(
    (seId: string) => {
      approvePlan(seId);
      setAiDrawerKey(null);
      const se = seProfiles.find((s) => s.id === seId);
      if (se) showToast(`Plan approved for ${se.name} — calendar updated`, "#0A6E45");
    },
    [approvePlan, seProfiles, showToast],
  );

  const handleApproveAll = useCallback(() => {
    const pending = seProfiles.filter((s) => s.hasAiSuggestion).map((s) => s.id);
    approveAll(pending);
    showToast("All AI plans approved and milestones sent to calendar", "#0A6E45");
  }, [approveAll, seProfiles, showToast]);

  const handleSyncCalendar = useCallback(() => {
    seProfiles
      .filter((s) => planIsActive(mockSEProfiles.find((m) => m.id === s.id)!, approved))
      .forEach((se) => {
        const raw = mockSEProfiles.find((m) => m.id === se.id);
        if (raw) {
          downloadMilestonesICS(se, raw.approvedGoals.map((g) => ({ title: g.title, milestones: g.milestones })));
        }
      });
    showToast("All plan milestones synced to Plan Calendar", "#0071CE");
  }, [approved, seProfiles, showToast]);

  const handleSubmitContent = useCallback(() => {
    setContentModal(null);
    showToast("Scenario brief submitted — content team notified", "#CC27B0");
  }, [showToast]);

  const pendingCount = seProfiles.filter((s) => s.hasAiSuggestion).length;
  const activeCount = seProfiles.filter((s) => planIsActive(mockSEProfiles.find((m) => m.id === s.id)!, approved)).length;
  const onTrackGoals = seProfiles.flatMap((s) => s.goals).filter((g) => g.tag === "ON TRACK").length;
  const calItems = seProfiles.flatMap((s) => s.calendarItems).length;
  const contentGaps = seProfiles.flatMap((s) => s.goals).filter((g) => g.isNewContent).length;

  return (
    <div className="flex flex-col overflow-hidden border border-[#E2DFD9] bg-[#F5F4F0]">
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-[#E2DFD9] bg-white px-5">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10.5px] text-[#3D3C38]">Development › AI Growth Plans</span>
          <div className="flex items-center gap-1.5 border border-[rgba(0,113,206,.15)] bg-[rgba(0,113,206,.06)] px-2.5 py-[3px]">
            <div className="ai-dot h-1.5 w-1.5 shrink-0 rounded-full bg-[#0071CE]" />
            <span className="font-mono text-[8px] tracking-widest text-[#0071CE]">AI ENGINE ACTIVE</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="cursor-pointer border border-[rgba(0,113,206,.2)] bg-[#F0F7FF] px-3 py-[5px] text-[9.5px] font-semibold text-[#0071CE]"
            onClick={handleSyncCalendar}
            type="button"
          >
            Sync to Calendar
          </button>
          {pendingCount > 0 ? (
            <button
              className="cursor-pointer bg-[#0071CE] px-3 py-[5px] text-[9.5px] font-semibold text-white"
              onClick={handleApproveAll}
              type="button"
            >
              Approve all AI suggestions
            </button>
          ) : null}
        </div>
      </header>

      <div className="flex flex-col gap-4 overflow-y-auto p-[20px_24px]">
        <div className="grid shrink-0 grid-cols-2 gap-px border border-[#E2DFD9] bg-[#E2DFD9] sm:grid-cols-3 lg:grid-cols-5">
          {[
            {
              label: "SEs with active plans",
              value: String(activeCount),
              sub: `${pendingCount} need AI setup`,
              color: activeCount > 0 ? "#0A6E45" : "#D4810A",
            },
            { label: "AI suggestions pending", value: String(pendingCount), sub: "Awaiting approval", color: "#CC27B0" },
            { label: "Goals on track", value: String(onTrackGoals), sub: "Across all plans", color: "#0A6E45" },
            { label: "Milestones on calendar", value: String(calItems), sub: "Auto-synced", color: "#0071CE" },
            {
              label: "Content gaps flagged",
              value: String(contentGaps),
              sub: "New scenarios needed",
              color: contentGaps > 0 ? "#D4810A" : "#A09D98",
            },
          ].map((sc) => (
            <div className="bg-white p-[12px_16px]" key={sc.label}>
              <div className="mb-1 font-mono text-[8px] uppercase tracking-widest text-[#A09D98]">{sc.label}</div>
              <div className="text-xl font-bold" style={{ color: sc.color }}>
                {sc.value}
              </div>
              <div className="mt-0.5 font-mono text-[8px] text-[#6B6860]">{sc.sub}</div>
            </div>
          ))}
        </div>

        {seProfiles.map((se, i) => (
          <SECard
            animationDelay={`${i * 0.05}s`}
            isApproved={planIsActive(mockSEProfiles.find((m) => m.id === se.id)!, approved)}
            key={se.id}
            onReviewAI={() => setAiDrawerKey(se.id)}
            onSubmitContent={(title) => setContentModal({ seId: se.id, title })}
            onViewPlan={() => setPlanDrawerKey(se.id)}
            se={se}
          />
        ))}
      </div>

      {aiDrawerKey && aiDrawerSE ? (
        <AIReviewDrawer
          onAddToCalendar={() => {
            downloadMilestonesICS(aiDrawerSE, []);
            showToast("Milestones added to calendar", "#0071CE");
            setAiDrawerKey(null);
          }}
          onApprove={() => handleApprovePlan(aiDrawerKey)}
          onClose={() => setAiDrawerKey(null)}
          se={aiDrawerSE}
        />
      ) : null}

      {planDrawerKey && planDrawerSE ? (
        <FullPlanDrawer onClose={() => setPlanDrawerKey(null)} onSyncCalendar={handleSyncCalendar} se={planDrawerSE} />
      ) : null}

      {contentModal ? (
        <ContentSubmitModal
          goalTitle={contentModal.title}
          onClose={() => setContentModal(null)}
          onSubmit={handleSubmitContent}
          seId={contentModal.seId}
        />
      ) : null}

      {toast ? (
        <div
          className="pointer-events-none fixed bottom-7 left-1/2 z-[1000] -translate-x-1/2 whitespace-nowrap px-5 py-2.5 text-xs font-medium text-white shadow-[0_8px_24px_rgba(0,0,0,.25)]"
          style={{ background: toast.color }}
        >
          {toast.msg}
        </div>
      ) : null}
    </div>
  );
}
