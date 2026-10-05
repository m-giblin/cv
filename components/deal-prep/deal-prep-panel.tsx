"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DealPrepBrief, DealPrepBriefEmpty } from "@/components/deal-prep/deal-prep-brief";
import { DealPrepForm, EMPTY_FORM, type DealPrepFormValues } from "@/components/deal-prep/deal-prep-form";
import { DealPrepHistory } from "@/components/deal-prep/deal-prep-history";
import { ObjectionPracticePanel } from "@/components/deal-prep/objection-practice-panel";
import { Drawer } from "@/components/ui/drawer";
import type { DealPrepOutput } from "@/lib/ai/schemas";
import type { SeLevel } from "@/lib/types";

type SessionRecord = {
  id: string;
  account_name: string;
  industry: string;
  solutions: string[];
  account_context: string | null;
  meeting_type: string | null;
  deal_stage: string | null;
  attendees: string | null;
  meeting_date: string | null;
  competitors: string | null;
  debrief_notes: string | null;
  shared_with_manager: boolean;
  outcome: "pending" | "won" | "lost";
  prep_output: DealPrepOutput;
};

export function DealPrepPanel({
  userLevel = "Basic",
  userId,
  assignmentStepId,
  initialSessionId,
  historyOpen = false,
  onCloseHistory,
}: {
  userLevel?: SeLevel | string;
  userId: string;
  assignmentStepId?: string;
  initialSessionId?: string;
  historyOpen?: boolean;
  onCloseHistory?: () => void;
}) {
  const [form, setForm] = useState<DealPrepFormValues>(EMPTY_FORM);
  const [result, setResult] = useState<DealPrepOutput | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [parentSessionId, setParentSessionId] = useState<string | null>(null);
  const [sharedWithManager, setSharedWithManager] = useState(false);
  const [debriefNotes, setDebriefNotes] = useState("");
  const [outcome, setOutcome] = useState<"pending" | "won" | "lost">("pending");
  const [isLoading, setIsLoading] = useState(false);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [practiceObjection, setPracticeObjection] = useState<string | null>(null);

  // Stable close handler so the Drawer's focus/Esc effect doesn't re-run on every render.
  const onCloseHistoryRef = useRef(onCloseHistory);
  useEffect(() => {
    onCloseHistoryRef.current = onCloseHistory;
  }, [onCloseHistory]);
  const closeHistory = useCallback(() => onCloseHistoryRef.current?.(), []);

  const solutionsList = form.solutions
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const generatePrep = useCallback(
    async (regenerateFocus?: string) => {
      setIsLoading(true);

      let accountContext = form.accountContext;
      if (form.crmAccountId.trim()) {
        accountContext = `CRM Account ID: ${form.crmAccountId}\n${accountContext}`;
      }

      try {
        const gongResponse = await fetch("/api/integrations/gong/brief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountName: form.accountName }),
        });
        if (gongResponse.ok) {
          const gongBody = (await gongResponse.json()) as {
            brief?: { summary: string; talkTrackHints: string[] };
          };
          if (gongBody.brief) {
            accountContext = `${accountContext}\n\nGong pre-call intel:\n${gongBody.brief.summary}\n${gongBody.brief.talkTrackHints.join("\n")}`;
          }
        }
      } catch {
        // Gong brief is optional
      }

      const response = await fetch("/api/ai/deal-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountName: form.accountName,
          industry: form.industry,
          solutions: solutionsList,
          accountContext,
          meetingType: form.meetingType,
          dealStage: form.dealStage,
          attendees: form.attendees,
          competitors: form.competitors,
          level: userLevel,
          regenerateFocus,
        }),
      });

      if (!response.ok) {
        toast.error("Deal prep generation failed.");
        setIsLoading(false);
        return;
      }

      const body = (await response.json()) as { object: DealPrepOutput };
      setResult(body.object);

      const saveResponse = await fetch("/api/deal-prep/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountName: form.accountName,
          industry: form.industry,
          solutions: solutionsList,
          accountContext: form.accountContext,
          meetingType: form.meetingType,
          dealStage: form.dealStage,
          attendees: form.attendees,
          meetingDate: form.meetingDate || undefined,
          competitors: form.competitors,
          prepOutput: body.object,
          parentSessionId: parentSessionId ?? activeSessionId ?? undefined,
          assignmentStepId,
        }),
      });

      if (!saveResponse.ok) {
        toast.error("Brief generated but could not save to history.");
        setActiveSessionId(null);
      } else {
        const saved = (await saveResponse.json()) as { id: string };
        setActiveSessionId(saved.id);
        setParentSessionId(saved.id);
        setSharedWithManager(false);
        setDebriefNotes("");
        setOutcome("pending");
        if (assignmentStepId) {
          toast.success("Deal prep saved and submitted for plan review.");
        }
      }

      setHistoryRefresh((value) => value + 1);
      setIsLoading(false);
    },
    [activeSessionId, assignmentStepId, form, parentSessionId, solutionsList, userLevel],
  );

  const loadSession = useCallback(async (sessionId: string) => {
    const response = await fetch(`/api/deal-prep/sessions/${sessionId}`);
    if (!response.ok) {
      toast.error("Could not load that prep session.");
      return;
    }

    const body = (await response.json()) as { session: SessionRecord };
    const session = body.session;

    setResult(session.prep_output);
    setForm({
      accountName: session.account_name,
      industry: session.industry,
      solutions: (session.solutions ?? []).join(", "),
      accountContext: session.account_context ?? "",
      meetingType: session.meeting_type ?? "discovery",
      dealStage: session.deal_stage ?? "qualify",
      attendees: session.attendees ?? "",
      meetingDate: session.meeting_date ?? "",
      competitors: session.competitors ?? "",
      crmAccountId: "",
    });
    setActiveSessionId(session.id);
    setParentSessionId(session.id);
    setSharedWithManager(session.shared_with_manager);
    setDebriefNotes(session.debrief_notes ?? "");
    setOutcome(session.outcome ?? "pending");
    onCloseHistory?.();
  }, [onCloseHistory]);

  useEffect(() => {
    if (initialSessionId) {
      void loadSession(initialSessionId);
    }
  }, [initialSessionId, loadSession]);

  async function deleteSession(sessionId: string) {
    const response = await fetch(`/api/deal-prep/sessions/${sessionId}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("Could not delete that prep session.");
      return;
    }

    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
      setResult(null);
    }

    toast.success("Prep session deleted.");
    setHistoryRefresh((value) => value + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        className={
          practiceObjection
            ? "grid grid-cols-1 items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)] 2xl:grid-cols-[340px_minmax(0,1fr)_380px]"
            : "grid grid-cols-1 items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]"
        }
      >
        <DealPrepForm
          isLoading={isLoading}
          onChange={setForm}
          onSubmit={() => void generatePrep()}
          values={form}
        />

        <div className="min-w-0">
          {result ? (
            <DealPrepBrief
              activePracticeObjection={practiceObjection}
              debriefNotes={debriefNotes}
              formContext={form}
              isRegenerating={isLoading}
              onOutcomeChange={setOutcome}
              onPracticeObjection={setPracticeObjection}
              onRegenerate={(focus) => void generatePrep(focus)}
              outcome={outcome}
              result={result}
              sessionId={activeSessionId}
              sharedWithManager={sharedWithManager}
            />
          ) : (
            <DealPrepBriefEmpty />
          )}
        </div>

        {practiceObjection ? (
          <div className="min-w-0 lg:col-span-2 2xl:col-span-1">
            <ObjectionPracticePanel
              accountName={result?.accountName ?? form.accountName}
              industry={form.industry}
              objection={practiceObjection}
              onClose={() => setPracticeObjection(null)}
              solutionFocus={solutionsList[0] ?? "Identity Security Cloud"}
              userId={userId}
              userLevel={userLevel}
            />
          </div>
        ) : null}
      </div>

      <Drawer onClose={closeHistory} open={historyOpen} title="Past briefs">
        <DealPrepHistory
          activeSessionId={activeSessionId}
          onDeleteSession={deleteSession}
          onLoadSession={loadSession}
          refreshToken={historyRefresh}
        />
      </Drawer>
    </div>
  );
}
