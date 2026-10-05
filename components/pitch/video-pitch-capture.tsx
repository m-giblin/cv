"use client";

import type { ReactNode } from "react";
import { Check, Clock, FileUp, Loader2, Trash2, Video } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { PitchCoachingRail, type PitchScoreRow } from "@/components/pitch/pitch-coaching-rail";
import { CARD_CLS, LABEL_CLS, TEXTAREA_CLS } from "@/components/se/form-classes";
import { Chip } from "@/components/ui/chip";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { PITCH_SCENARIOS } from "@/lib/pitch/pitch-scenarios";
import type { PitchQueueSlot, PitchScenarioRow } from "@/lib/pitch/pitch-queue";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type StudioMode = "assigned" | "practice";

const SECONDARY_BTN_CLS =
  "btn-secondary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50";

type ScenarioView = {
  id: string;
  shortLabel: string;
  label: string;
  promptLabel: string;
  prompt: string;
  description: string;
  maxDurationSec: number;
};

function deriveScores(reflection: string, tipCount: number): PitchScoreRow[] {
  const len = reflection.trim().length;
  const base = Math.min(92, 68 + Math.floor(len / 8) - tipCount * 4);
  return [
    { label: "Clarity & structure", score: Math.max(55, base + 2) },
    { label: "Value articulation", score: Math.max(50, base - 4) },
    { label: "Confidence & pacing", score: Math.max(52, base) },
  ];
}

function fallbackScenarios(): ScenarioView[] {
  return PITCH_SCENARIOS.map((item) => ({
    id: item.id,
    shortLabel: item.shortLabel,
    label: item.label,
    promptLabel: item.promptLabel,
    prompt: item.prompt,
    description: item.description,
    maxDurationSec: 60,
  }));
}

function mapScenarioRow(row: PitchScenarioRow): ScenarioView {
  return {
    id: row.id,
    shortLabel: row.shortLabel,
    label: row.label,
    promptLabel: row.promptLabel,
    prompt: row.prompt,
    description: row.description,
    maxDurationSec: row.maxDurationSec,
  };
}

function formatMaxDuration(sec: number) {
  const minutes = Math.floor(sec / 60);
  const seconds = sec % 60;
  if (minutes > 0 && seconds === 0) return `${minutes}:00 max`;
  if (minutes > 0) return `${minutes}:${String(seconds).padStart(2, "0")} max`;
  return `0:${String(sec).padStart(2, "0")} max`;
}

export function VideoPitchCapture({
  initialScenarioId,
  peerLibrary,
}: {
  initialScenarioId?: string;
  peerLibrary?: ReactNode;
}) {
  const reflectionId = useId();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [studioMode, setStudioMode] = useState<StudioMode>("assigned");
  const [recording, setRecording] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("Elevator pitch");
  const [reflection, setReflection] = useState("");
  const [queue, setQueue] = useState<PitchQueueSlot[]>([]);
  const [practiceScenarios, setPracticeScenarios] = useState<ScenarioView[]>(fallbackScenarios());
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [selectedQueueSlotId, setSelectedQueueSlotId] = useState<string | null>(null);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [coachTips, setCoachTips] = useState<string[]>([]);
  const [coachScores, setCoachScores] = useState<PitchScoreRow[]>([]);
  const [coaching, setCoaching] = useState(false);
  const [savedPractice, setSavedPractice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const assignedScenarios = queue.map((slot) => ({
    slot,
    scenario: mapScenarioRow(slot.scenario),
  }));

  const activeScenarioList = studioMode === "assigned"
    ? assignedScenarios.map((item) => item.scenario)
    : practiceScenarios;

  const scenario =
    activeScenarioList.find((item) => item.id === selectedScenarioId) ??
    activeScenarioList[0] ??
    fallbackScenarios()[0]!;

  const loadQueue = useCallback(async (opts?: { reselectFirst?: boolean }) => {
    setLoadingQueue(true);
    const response = await fetch("/api/pitch/queue");
    if (response.ok) {
      const body = (await response.json()) as { queue: PitchQueueSlot[] };
      setQueue(body.queue);
      if (opts?.reselectFirst) {
        const next = body.queue.find((slot) => !slot.submissionId) ?? body.queue[0];
        if (next) {
          setSelectedScenarioId(next.scenario.id);
          setSelectedQueueSlotId(next.id);
        }
      }
    }
    setLoadingQueue(false);
  }, []);

  const loadPracticeScenarios = useCallback(async () => {
    const response = await fetch("/api/pitch/scenarios");
    if (!response.ok) return;
    const body = (await response.json()) as { scenarios: PitchScenarioRow[] };
    if (body.scenarios.length === 0) return;
    setPracticeScenarios(body.scenarios.map(mapScenarioRow));
  }, []);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/pitch/queue");
      if (response.ok) {
        const body = (await response.json()) as { queue: PitchQueueSlot[] };
        setQueue(body.queue);
        if (body.queue[0]) {
          setSelectedScenarioId(body.queue[0].scenario.id);
          setSelectedQueueSlotId(body.queue[0].id);
        }
      }
      setLoadingQueue(false);
      await loadPracticeScenarios();
    })();
  }, [loadPracticeScenarios]);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  useEffect(() => {
    setTitle(scenario.shortLabel);
    setCoachTips([]);
    setCoachScores([]);
    setSavedPractice(false);
  }, [scenario.shortLabel, scenario.id]);

  function selectAssignedSlot(slot: PitchQueueSlot) {
    setSelectedScenarioId(slot.scenario.id);
    setSelectedQueueSlotId(slot.id);
  }

  function selectPracticeScenario(id: string) {
    setSelectedScenarioId(id);
    setSelectedQueueSlotId(null);
  }

  function switchToAssigned() {
    setStudioMode("assigned");
    const current =
      queue.find((slot) => slot.id === selectedQueueSlotId && !slot.submissionId) ??
      queue.find((slot) => !slot.submissionId) ??
      queue[0];
    if (current) {
      setSelectedScenarioId(current.scenario.id);
      setSelectedQueueSlotId(current.id);
    }
  }

  function switchToPractice() {
    setStudioMode("practice");
    setSelectedQueueSlotId(null);
    const stillValid = practiceScenarios.some((item) => item.id === selectedScenarioId);
    if (stillValid) return;

    const fromUrl = initialScenarioId
      ? practiceScenarios.find((item) => item.id === initialScenarioId)
      : undefined;
    if (fromUrl) {
      setSelectedScenarioId(fromUrl.id);
      return;
    }

    if (practiceScenarios[0]) {
      setSelectedScenarioId(practiceScenarios[0].id);
    }
  }

  async function runAiCoach() {
    if (reflection.trim().length < 10) {
      toast.error("Add a reflection first — AI coach needs your storyline.");
      return;
    }
    setCoaching(true);
    const response = await fetch("/api/pitch/ai-coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, reflection, scenario: scenario.label }),
    });
    setCoaching(false);
    if (!response.ok) return;
    const body = (await response.json()) as { tips: string[] };
    setCoachTips(body.tips);
    setCoachScores(deriveScores(reflection, body.tips.length));
  }

  async function startRecording() {
    try {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlob(null);
        setBlobUrl(null);
        setCoachTips([]);
        setCoachScores([]);
      }
      if (videoRef.current) {
        videoRef.current.removeAttribute("src");
        videoRef.current.load();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const nextBlob = new Blob(chunksRef.current, { type: "video/webm" });
        setBlob(nextBlob);
        setBlobUrl(URL.createObjectURL(nextBlob));
        stream.getTracks().forEach((track) => track.stop());
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      toast.message(`Recording — ${scenario.description}`);
    } catch {
      toast.error("Camera/mic permission required.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  function discardRecording() {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlob(null);
    setBlobUrl(null);
    setCoachTips([]);
    setCoachScores([]);
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream | null;
      stream?.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      videoRef.current.removeAttribute("src");
      videoRef.current.load();
    }
    toast.message("Recording discarded — start again when you're ready.");
  }

  async function uploadEvidence(): Promise<{ evidencePath: string } | null> {
    if (!blob) {
      toast.error("Record a pitch first.");
      return null;
    }

    const supabase = createClient();
    if (!supabase) {
      toast.error("Storage not configured.");
      return null;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sign in required.");
      return null;
    }

    const evidencePath = `${user.id}/${Date.now()}-pitch.webm`;
    const { error: uploadError } = await supabase.storage.from("evidence").upload(evidencePath, blob, {
      contentType: "video/webm",
    });
    if (uploadError) {
      toast.error(uploadError.message);
      return null;
    }

    return { evidencePath };
  }

  async function savePractice() {
    if (!reflection.trim() && !blob) {
      toast.error("Record or add a reflection before saving.");
      return;
    }

    setUploading(true);
    const uploaded = blob ? await uploadEvidence() : null;
    if (blob && !uploaded) {
      setUploading(false);
      return;
    }

    const response = await fetch("/api/pitch/practice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `${scenario.label}: ${title}`,
        evidencePath: uploaded?.evidencePath,
        reflectionText: reflection || undefined,
        scenarioId: scenario.id,
        aiScores: coachScores.length > 0 ? coachScores : undefined,
      }),
    });

    setUploading(false);
    if (!response.ok) {
      toast.error("Could not save practice session.");
      return;
    }

    setSavedPractice(true);
    toast.success("Practice saved — your manager was not notified.");
  }

  async function submitForReview() {
    if (!blob) {
      toast.error("Record a pitch before submitting.");
      return;
    }

    if (studioMode === "assigned" && !selectedQueueSlotId) {
      toast.error("Select an assigned queue slot first.");
      return;
    }

    setUploading(true);
    const uploaded = await uploadEvidence();
    if (!uploaded) {
      setUploading(false);
      return;
    }

    const response = await fetch("/api/pitch/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `${scenario.label}: ${title}`,
        evidencePath: uploaded.evidencePath,
        reflectionText: reflection || undefined,
        targetType: "certification",
        scenarioId: scenario.id,
        queueSlotId: selectedQueueSlotId ?? undefined,
      }),
    });

    setUploading(false);
    if (!response.ok) {
      toast.error("Pitch upload failed.");
      return;
    }

    toast.success("Pitch submitted for manager review.");
    setBlob(null);
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
    setReflection("");
    setCoachTips([]);
    setCoachScores([]);
    setSavedPractice(false);
    await loadQueue({ reselectFirst: true });
  }

  const statusLabel = recording ? "RECORDING" : blobUrl ? "REVIEW" : "STANDBY";
  const statusSymbol = recording ? "●" : blobUrl ? "◆" : "○";
  const showCamera = recording || blobUrl;
  const selectedSlotPending = Boolean(queue.find((s) => s.id === selectedQueueSlotId)?.submissionId);

  return (
    <div className={cn(CARD_CLS, "flex min-h-0 flex-1 flex-col overflow-hidden lg:grid lg:grid-cols-[minmax(0,1fr)_340px]")}>
      <div className="flex min-h-[50vh] min-w-0 flex-col overflow-hidden border-b border-line lg:min-h-0 lg:border-b-0 lg:border-r">
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-divider px-4 py-3 sm:px-5">
          <SegmentedToggle
            label="Studio mode"
            onChange={(id) => (id === "assigned" ? switchToAssigned() : switchToPractice())}
            options={[
              { id: "assigned", label: "Assigned queue" },
              { id: "practice", label: "Free practice" },
            ]}
            value={studioMode}
          />
          <span className="label-mono ml-auto">
            {studioMode === "assigned" ? "Manager review on submit" : "Private — no manager notify"}
          </span>
        </div>

        <div
          aria-label={studioMode === "assigned" ? "Queue slots" : "Scenarios"}
          className="flex shrink-0 flex-wrap items-center gap-2 border-b border-divider px-4 py-3 sm:px-5"
          role="group"
        >
          <span className="label-mono mr-1">{studioMode === "assigned" ? "Queue slot" : "Scenario"}</span>
          {studioMode === "assigned" && loadingQueue ? (
            <span className="inline-flex items-center gap-1.5 text-[13px] text-muted" role="status">
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              Loading queue…
            </span>
          ) : null}
          {studioMode === "assigned"
            ? queue.map((slot) => (
                <Chip
                  active={selectedQueueSlotId === slot.id}
                  className="disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={Boolean(slot.submissionId)}
                  key={slot.id}
                  onClick={() => selectAssignedSlot(slot)}
                >
                  Slot {slot.slot}: {slot.scenario.shortLabel}
                  {slot.submissionId ? " · pending" : ""}
                </Chip>
              ))
            : practiceScenarios.map((item) => (
                <Chip
                  active={selectedScenarioId === item.id}
                  key={item.id}
                  onClick={() => selectPracticeScenario(item.id)}
                >
                  {item.shortLabel}
                </Chip>
              ))}
        </div>

        <div className="shrink-0 bg-blue px-4 py-3 sm:px-5">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.03em] text-signal">{scenario.promptLabel}</p>
          <p className="mt-1 text-[15px] leading-[1.5] text-white">&ldquo;{scenario.prompt}&rdquo;</p>
        </div>

        <div className="relative flex min-h-[280px] flex-1 flex-col items-center justify-center overflow-hidden bg-ink sm:min-h-[320px]">
          <div
            className="absolute left-3 top-3 z-10 rounded-full border-[1.5px] border-blue-line bg-ink px-[9px] py-0.5 font-mono text-xs font-medium uppercase tracking-[0.03em] text-white sm:left-3.5 sm:top-3.5"
            role="status"
          >
            <span className={recording ? "text-signal" : "text-on-blue-muted"}>{statusSymbol}</span> {statusLabel}
          </div>

          {showCamera ? (
            <video
              className="absolute inset-0 h-full w-full object-cover"
              controls={Boolean(blobUrl && !recording)}
              muted={!blobUrl || recording}
              playsInline
              ref={videoRef}
              src={blobUrl && !recording ? blobUrl : undefined}
            />
          ) : (
            <>
              <Video aria-hidden="true" className="mb-3 h-8 w-8 text-on-blue-muted" strokeWidth={1.5} />
              <p className="mb-1 font-mono text-xs uppercase tracking-[0.03em] text-on-blue-muted">Camera ready</p>
              <p className="mb-6 px-4 text-center text-[13px] text-on-blue">Allow camera access to begin recording</p>
            </>
          )}

          <div className="relative z-10 mt-auto flex w-full flex-wrap items-center justify-center gap-3 px-3 pb-4 sm:gap-4">
            <button
              className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-blue-line px-3 py-1.5 font-mono text-xs uppercase tracking-[0.03em] text-on-blue-muted disabled:cursor-not-allowed"
              disabled
              type="button"
            >
              <FileUp aria-hidden="true" className="h-4 w-4" />
              Upload
            </button>
            {!recording ? (
              <button
                aria-label="Start recording"
                className="flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-white bg-danger sm:h-16 sm:w-16"
                onClick={() => void startRecording()}
                type="button"
              >
                <span aria-hidden="true" className="h-4 w-4 rounded-full bg-white sm:h-5 sm:w-5" />
              </button>
            ) : (
              <button
                aria-label="Stop recording"
                className="flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-white bg-danger sm:h-16 sm:w-16"
                onClick={stopRecording}
                type="button"
              >
                <span aria-hidden="true" className="h-3.5 w-3.5 rounded-[2px] bg-white sm:h-4 sm:w-4" />
              </button>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-blue-line px-3 py-1.5 font-mono text-xs uppercase tracking-[0.03em] text-on-blue-muted">
              <Clock aria-hidden="true" className="h-4 w-4" />
              {formatMaxDuration(scenario.maxDurationSec)}
            </span>
          </div>

          {blobUrl && !recording ? (
            <button
              className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-danger bg-danger-soft px-3 py-1 text-[13px] font-bold text-danger disabled:opacity-50 sm:right-3.5 sm:top-3.5"
              disabled={uploading}
              onClick={discardRecording}
              type="button"
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
              Discard
            </button>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-divider bg-white px-4 py-4 sm:px-5">
          <label className={LABEL_CLS} htmlFor={reflectionId}>
            Reflection <span className="font-normal text-muted">(required for AI scoring)</span>
          </label>
          <textarea
            className={cn(TEXTAREA_CLS, "mt-1.5 min-h-[64px] resize-none")}
            id={reflectionId}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="What story structure did you use? What would you change?"
            rows={2}
            value={reflection}
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              className={SECONDARY_BTN_CLS}
              disabled={coaching}
              onClick={() => void runAiCoach()}
              type="button"
            >
              {coaching ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
              Get AI coaching →
            </button>
            {studioMode === "practice" ? (
              <button
                className="btn-primary ml-auto inline-flex items-center gap-2"
                disabled={uploading}
                onClick={() => void savePractice()}
                type="button"
              >
                {uploading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
                {savedPractice ? <Check aria-hidden="true" className="h-4 w-4" /> : null}
                Save practice
              </button>
            ) : null}
            {studioMode === "assigned" ? (
              <button
                className="btn-primary ml-auto inline-flex items-center gap-2"
                disabled={uploading || !blob || selectedSlotPending}
                onClick={() => void submitForReview()}
                type="button"
              >
                {uploading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
                Submit for review →
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="max-h-[45vh] min-h-0 overflow-y-auto bg-white lg:max-h-none">
        <PitchCoachingRail
          hasSubmission={coachScores.length > 0}
          scores={coachScores}
          topNote={coachTips[0] ?? null}
        />
        {peerLibrary}
      </div>
    </div>
  );
}
