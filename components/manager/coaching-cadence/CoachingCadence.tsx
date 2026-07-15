"use client";

import { useCallback, useMemo, useState } from "react";
import { CoachingNoteModal } from "./CoachingNoteModal";
import { CoachingQueue } from "./CoachingQueue";
import {
  computeSummaryStats,
  defaultActionTemplates,
  mockProfiles,
  urgencyScores,
} from "./data";
import { useCoachingNotes } from "./hooks/useCoachingNotes";
import { SEProfilePanel } from "./SEProfilePanel";
import type { ActionButton, BriefPoint, SavedNote, SEProfile } from "./types";
import { openBriefPdf } from "./utils/briefPdf";
import { generateICS } from "./utils/icsExport";
import { buildMailto } from "./utils/mailto";

type ActionHandlers = {
  showToast: (msg: string, color: string) => void;
  handleSchedule1on1: (se: SEProfile) => void;
  handleSignOffGate: (se: SEProfile) => void;
  handleAssignSim: (se: SEProfile, simName: string) => void;
  handlePairWith: (target: string) => void;
  handleNominateCoach: (name: string) => void;
  handleScheduleGate4: (name: string) => void;
  openNoteModal: () => void;
};

function wireBriefActions(brief: BriefPoint[], se: SEProfile, handlers: ActionHandlers): BriefPoint[] {
  return brief.map((pt) => {
    let actionFn: (() => void) | undefined;
    if (pt.action === "Sign off Gate 1 →") {
      actionFn = () => handlers.handleSignOffGate(se);
    } else if (pt.action === "Assign sim now") {
      actionFn = () =>
        handlers.handleAssignSim(se, "Enterprise Discovery: IT + Security + HR");
    } else if (pt.action === "Assign DemoHub challenge") {
      actionFn = () => handlers.handleAssignSim(se, "DemoHub submission challenge");
    } else if (pt.action === "Pair with Harper Ivan") {
      actionFn = () => handlers.handlePairWith("Harper Ivan");
    } else if (pt.action === "Assign competitive sim") {
      actionFn = () => handlers.handleAssignSim(se, "SailPoint vs. Saviynt Competitive Bakeoff");
    } else if (pt.action === "Submit peer coach nomination") {
      actionFn = () => handlers.handleNominateCoach(se.name);
    } else if (pt.action === "Schedule Gate 4 sim") {
      actionFn = () => handlers.handleScheduleGate4(se.name);
    }
    return { ...pt, actionFn: actionFn ?? (() => {}) };
  });
}

function wireBottomActions(
  seKey: string,
  se: SEProfile,
  handlers: ActionHandlers,
): ActionButton[] {
  const templates = defaultActionTemplates[seKey] ?? [];
  return templates.map((template) => {
    let fn: () => void = () => {};
    if (template.label === "Log coaching note") {
      fn = handlers.openNoteModal;
    } else if (template.label === "Sign off Gate 1") {
      fn = () => handlers.handleSignOffGate(se);
    } else if (template.label.startsWith("Assign")) {
      const simName = template.label.replace("Assign ", "");
      fn = () => handlers.handleAssignSim(se, simName);
    } else if (template.label.startsWith("Pair")) {
      fn = () => handlers.handlePairWith("Harper Ivan");
    } else if (template.label.startsWith("Submit")) {
      fn = () => handlers.handleNominateCoach(se.name);
    } else if (template.label.startsWith("Schedule Gate")) {
      fn = () => handlers.handleScheduleGate4(se.name);
    } else if (template.label === "Schedule 1:1") {
      fn = () => handlers.handleSchedule1on1(se);
    } else if (template.label === "Plan career path") {
      fn = () => handlers.showToast("Career path planning coming soon", "#0071CE");
    }
    return { ...template, fn };
  });
}

export function CoachingCadence({
  initialSelectedKey,
  onSelectSe,
}: {
  initialSelectedKey?: string;
  onSelectSe?: (key: string) => void;
}) {
  const defaultKey = Object.keys(mockProfiles).sort(
    (a, b) => (urgencyScores[b] ?? 0) - (urgencyScores[a] ?? 0),
  )[0];
  const resolvedInitial =
    initialSelectedKey && mockProfiles[initialSelectedKey] ? initialSelectedKey : defaultKey;

  const [selectedKey, setSelectedKey] = useState(resolvedInitial);
  const [toast, setToast] = useState<{ msg: string; color: string } | null>(null);
  const [noteModal, setNoteModal] = useState(false);
  const { notes, addNote } = useCoachingNotes(selectedKey);

  const showToast = useCallback((msg: string, color: string) => {
    setToast({ msg, color });
    window.setTimeout(() => setToast(null), 3000);
  }, []);

  const handleSelect = useCallback(
    (key: string) => {
      setSelectedKey(key);
      onSelectSe?.(key);
    },
    [onSelectSe],
  );

  const handleSchedule1on1 = useCallback(
    (se: SEProfile) => {
      generateICS(se);
      showToast(`Calendar invite downloaded for ${se.name}`, "#0A6E45");
    },
    [showToast],
  );

  const handleDownloadBrief = useCallback(
    (se: SEProfile) => {
      openBriefPdf(se);
      showToast("Brief PDF opening…", "#0071CE");
    },
    [showToast],
  );

  const handleCopyBrief = useCallback(
    (se: SEProfile) => {
      const lines = se.brief.map((pt) => `• ${pt.text}`).join("\n\n");
      const text = `1:1 Brief — ${se.name} (${se.level}, Day ${se.day})\n\n${lines}`;
      void navigator.clipboard.writeText(text).then(() =>
        showToast("Brief copied to clipboard", "#0071CE"),
      );
    },
    [showToast],
  );

  const handleSignOffGate = useCallback(
    async (se: SEProfile) => {
      if (!se.gateStepId) {
        showToast(`No gate step linked for ${se.name} — assign a plan gate first`, "#D4810A");
        return;
      }

      const response = await fetch(`/api/gates/${encodeURIComponent(se.gateStepId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        showToast(payload?.error ?? "Could not approve gate", "#B83128");
        return;
      }

      showToast(`Gate approved for ${se.name} — they can now advance to Phase 2`, "#0A6E45");
    },
    [showToast],
  );

  const handleAssignSim = useCallback(
    async (se: SEProfile, simName: string) => {
      const isUuid = /^[0-9a-f-]{36}$/i.test(se.id);
      if (!isUuid) {
        showToast(`Sim queued for demo profile "${simName}" (preview data)`, "#0071CE");
        return;
      }

      const response = await fetch("/api/sim-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seId: se.id, simName }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        showToast(payload?.error ?? "Could not assign simulation", "#B83128");
        return;
      }

      showToast(`Sim assigned: "${simName}" — ${se.name} will be notified`, "#0071CE");
    },
    [showToast],
  );

  const handlePairWith = useCallback(
    (target: string) => {
      showToast(`Peer buddy request sent to ${target}`, "#0071CE");
    },
    [showToast],
  );

  const handleNominateCoach = useCallback(
    (name: string) => {
      showToast(`Peer coach nomination submitted for ${name}`, "#0A6E45");
    },
    [showToast],
  );

  const handleScheduleGate4 = useCallback(
    (name: string) => {
      showToast(`Gate 4 sim scheduled for ${name}`, "#0071CE");
    },
    [showToast],
  );

  const handleSaveNote = useCallback(
    async (se: SEProfile, noteText: string) => {
      if (!noteText.trim()) return;

      const today = new Date();
      const newNote: SavedNote = {
        seId: se.id,
        date: today.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        dow: today.toLocaleDateString("en-US", { weekday: "short" }),
        focus: "Coaching note",
        note: noteText.trim(),
        outcomeLabel: "LOGGED",
        outcomeColor: "#0071CE",
        outcomeBg: "rgba(0,113,206,.08)",
        delta: "—",
        deltaColor: "#A09D98",
      };

      await addNote(se.id, newNote);
      setNoteModal(false);
      showToast(`Note saved — sending summary to ${se.name}`, "#0A6E45");
      window.setTimeout(() => {
        window.location.href = buildMailto(se, noteText);
      }, 800);
    },
    [addNote, showToast],
  );

  const queueKeys = useMemo(
    () =>
      Object.keys(mockProfiles).sort(
        (a, b) => (urgencyScores[b] ?? 0) - (urgencyScores[a] ?? 0),
      ),
    [],
  );

  const summary = useMemo(() => computeSummaryStats(mockProfiles), []);

  const se = useMemo(() => {
    const baseProfile = mockProfiles[selectedKey];
    const savedNotes = notes[selectedKey] ?? [];
    const mergedHistory = [...savedNotes, ...(baseProfile.history || [])];

    const handlers: ActionHandlers = {
      showToast,
      handleSchedule1on1,
      handleSignOffGate,
      handleAssignSim,
      handlePairWith,
      handleNominateCoach,
      handleScheduleGate4,
      openNoteModal: () => setNoteModal(true),
    };

    const profile: SEProfile = {
      ...baseProfile,
      history: mergedHistory,
      hasHistory: mergedHistory.length > 0,
      noHistory: mergedHistory.length === 0,
      brief: wireBriefActions(baseProfile.brief, baseProfile, handlers),
      actions: wireBottomActions(selectedKey, baseProfile, handlers),
    };

    return profile;
  }, [
    selectedKey,
    notes,
    showToast,
    handleSchedule1on1,
    handleSignOffGate,
    handleAssignSim,
    handlePairWith,
    handleNominateCoach,
    handleScheduleGate4,
  ]);

  return (
    <div className="flex min-h-[calc(100vh-10rem)] flex-col overflow-hidden rounded-sm border border-[#E2DFD9] bg-[#F5F4F0] shadow-[0_1px_2px_rgba(0,0,0,.04)]">
      {/* Topbar */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-[#E2DFD9] bg-white px-5">
        <div className="flex items-center">
          <span className="font-mono text-[10.5px] text-[#A09D98]">Coaching</span>
          <span className="mx-0.5 text-[11px] text-[#C4C1BB]">›</span>
          <span className="font-mono text-[10.5px] font-medium text-[#3D3C38]">Coaching Cadence</span>
        </div>
        {summary.coachNow > 0 ? (
          <div className="flex items-center gap-1.5 border border-[rgba(184,49,40,.2)] bg-[#FEF0EE] px-2.5 py-1">
            <div className="h-1.5 w-1.5 animate-[alertPulse_2.8s_ease-in-out_infinite] rounded-full bg-[#B83128]" />
            <span className="text-[10.5px] font-medium text-[#B83128]">
              {summary.coachNow} SE{summary.coachNow === 1 ? "" : "s"} need coaching now
            </span>
          </div>
        ) : null}
      </div>

      <div className="border-b border-[rgba(0,113,206,.15)] bg-[rgba(0,113,206,.04)] px-5 py-2 text-[11px] text-[#0071CE]">
        Preview roster — coaching notes, sim assignments, and gate sign-offs persist when you select a real org SE (UUID).
        Demo profile keys still use local preview behavior.
      </div>

      {/* Page header + summary stats */}
      <div className="shrink-0 border-b border-[#E2DFD9] bg-white px-5 py-3.5">
        <div className="flex items-center justify-between">
          <div>
            <div className="mb-1 font-mono text-[8.5px] uppercase tracking-[0.14em] text-[#A09D98]">
              West Region · Q3 FY2026 · {summary.total} SEs
            </div>
            <div className="font-display text-[22px] font-extrabold leading-none tracking-[-0.025em] text-[#0D0E12]">
              Coaching Cadence
            </div>
          </div>
          <div className="flex overflow-hidden border border-[#E2DFD9]">
            {[
              { label: "Coach now", value: summary.coachNow, color: "#B83128" },
              { label: "Never had 1:1", value: summary.neverHad1on1, color: "#D4810A" },
              { label: "Team sim avg", value: summary.simAvg, color: "#0071CE" },
              { label: "Avg ramp", value: `${summary.rampAvg}%`, color: "#0D0E12" },
            ].map((stat, index) => (
              <div
                className={`px-4 py-2 text-center ${index < 3 ? "border-r border-[#E2DFD9]" : ""}`}
                key={stat.label}
              >
                <div className="mb-0.5 font-mono text-[7.5px] uppercase tracking-[0.1em] text-[#A09D98]">
                  {stat.label}
                </div>
                <div
                  className="font-display text-lg font-bold leading-none"
                  style={{ color: stat.color }}
                >
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two-panel body */}
      <div className="flex flex-1 overflow-hidden">
        <CoachingQueue
          keys={queueKeys}
          onSelect={handleSelect}
          profiles={mockProfiles}
          selectedKey={selectedKey}
        />
        <SEProfilePanel
          onCopyBrief={() => handleCopyBrief(se)}
          onDownloadBrief={() => handleDownloadBrief(se)}
          onLogNote={() => setNoteModal(true)}
          onSchedule={() => handleSchedule1on1(se)}
          se={se}
        />
      </div>

      {noteModal ? (
        <CoachingNoteModal
          onClose={() => setNoteModal(false)}
          onSave={(text) => handleSaveNote(se, text)}
          seName={se.name}
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
