"use client";

import type { ReactNode } from "react";
import { Check, Clock, Loader2, Mic, Trash2, Video } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { PitchCoachingRail, type PitchScoreRow } from "@/components/pitch/pitch-coaching-rail";
import { CARD_CLS, LABEL_CLS, TEXTAREA_CLS } from "@/components/se/form-classes";
import { Chip } from "@/components/ui/chip";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { PITCH_RESPONSE_MODE_LABELS, wordCount, type PitchResponseMode } from "@/lib/playbooks/drills";
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
  responseModes: PitchResponseMode[];
  /** The guide's pitch a playbook drill is scored against. */
  referenceText: string | null;
};

function normaliseModes(modes: string[] | undefined): PitchResponseMode[] {
  const valid = (modes ?? []).filter((mode): mode is PitchResponseMode => mode === "video" || mode === "voice" || mode === "text");
  return valid.length ? valid : ["video"];
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
    responseModes: ["video"],
    referenceText: null,
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
    responseModes: normaliseModes(row.responseModes),
    referenceText: row.referenceText ?? null,
  };
}

function formatMaxDuration(sec: number) {
  const minutes = Math.floor(sec / 60);
  const seconds = sec % 60;
  if (minutes > 0 && seconds === 0) return `${minutes}:00 max`;
  if (minutes > 0) return `${minutes}:${String(seconds).padStart(2, "0")} max`;
  return `0:${String(sec).padStart(2, "0")} max`;
}

function formatClock(sec: number) {
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
}

export function VideoPitchCapture({
  initialScenarioId,
  peerLibrary,
}: {
  initialScenarioId?: string;
  peerLibrary?: ReactNode;
}) {
  const reflectionId = useId();
  const typedId = useId();
  const videoRef = useRef<HTMLVideoElement>(null);
  // A link from a playbook opens that drill in free practice.
  const [studioMode, setStudioMode] = useState<StudioMode>(initialScenarioId ? "practice" : "assigned");
  const [responseMode, setResponseMode] = useState<PitchResponseMode>("video");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [durationSec, setDurationSec] = useState<number | undefined>(undefined);
  const [typedPitch, setTypedPitch] = useState("");
  const [transcript, setTranscript] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const [title, setTitle] = useState("Elevator pitch");
  const [reflection, setReflection] = useState("");
  const [queue, setQueue] = useState<PitchQueueSlot[]>([]);
  const [practiceScenarios, setPracticeScenarios] = useState<ScenarioView[]>(fallbackScenarios());
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(initialScenarioId ?? null);
  const [selectedQueueSlotId, setSelectedQueueSlotId] = useState<string | null>(null);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [coachTips, setCoachTips] = useState<string[]>([]);
  const [coachScores, setCoachScores] = useState<PitchScoreRow[]>([]);
  const [missed, setMissed] = useState<string[]>([]);
  const [overTime, setOverTime] = useState(false);
  const [showReference, setShowReference] = useState(false);
  const [coaching, setCoaching] = useState(false);
  const [savedPractice, setSavedPractice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef(0);

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
  const isDrill = Boolean(scenario.referenceText);
  const pitchText = responseMode === "text" ? typedPitch.trim() : transcript.trim();

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
        if (body.queue[0] && !initialScenarioId) {
          setSelectedScenarioId(body.queue[0].scenario.id);
          setSelectedQueueSlotId(body.queue[0].id);
        }
      }
      setLoadingQueue(false);
      await loadPracticeScenarios();
    })();
  }, [initialScenarioId, loadPracticeScenarios]);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  // Release the camera/mic if the page is left mid-recording.
  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);

  const resetAttempt = useCallback(() => {
    setCoachTips([]);
    setCoachScores([]);
    setMissed([]);
    setOverTime(false);
    setShowReference(false);
    setSavedPractice(false);
  }, []);

  useEffect(() => {
    setTitle(scenario.shortLabel);
    resetAttempt();
    setTranscript("");
    setTypedPitch("");
    setDurationSec(undefined);
    setResponseMode((current) => (scenario.responseModes.includes(current) ? current : scenario.responseModes[0]!));
  }, [scenario.shortLabel, scenario.id, scenario.responseModes, resetAttempt]);

  // Live camera preview. The video element mounts when recording starts, so attach the stream then.
  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!recording || responseMode !== "video" || !video || !stream) return;
    video.srcObject = stream;
    video.muted = true;
    void video.play().catch(() => undefined);
  }, [recording, responseMode]);

  // Recording clock; stops automatically at the scenario's time limit.
  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => {
      const seconds = (Date.now() - startedAtRef.current) / 1000;
      setElapsed(seconds);
      if (seconds >= scenario.maxDurationSec) {
        mediaRecorderRef.current?.stop();
        setRecording(false);
        toast.message("Time's up. Your recording stopped at the limit.");
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [recording, scenario.maxDurationSec]);

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

  function clearRecording() {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlob(null);
    setBlobUrl(null);
    setTranscript("");
    setDurationSec(undefined);
    setElapsed(0);
    resetAttempt();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.removeAttribute("src");
      videoRef.current.load();
    }
  }

  function changeResponseMode(mode: PitchResponseMode) {
    if (recording) return;
    clearRecording();
    setResponseMode(mode);
  }

  /** Recordings are transcribed once, on demand, so discarded takes cost nothing. */
  async function ensureTranscript(): Promise<string | null> {
    if (responseMode === "text") return typedPitch.trim();
    if (transcript) return transcript;
    if (!blob) return null;
    setTranscribing(true);
    const form = new FormData();
    form.append("audio", blob, responseMode === "voice" ? "pitch.webm" : "pitch-video.webm");
    const response = await fetch("/api/pitch/transcribe", { method: "POST", body: form }).catch(() => null);
    const body = (await response?.json().catch(() => null)) as { transcript?: string; error?: string } | null;
    setTranscribing(false);
    if (!response?.ok || !body?.transcript) {
      toast.error(body?.error ?? "Transcription didn't work just now.");
      return null;
    }
    setTranscript(body.transcript);
    return body.transcript;
  }

  async function runAiCoach() {
    const spoken = responseMode === "text" ? typedPitch.trim() : await ensureTranscript();
    if (isDrill && (!spoken || wordCount(spoken) < 8)) {
      toast.error(responseMode === "text" ? "Type your pitch first." : "Record your pitch first.");
      return;
    }
    if (!isDrill && reflection.trim().length < 10 && (!spoken || wordCount(spoken) < 8)) {
      toast.error("Record or type your pitch, or add a reflection, first.");
      return;
    }
    setCoaching(true);
    const response = await fetch("/api/pitch/ai-coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        reflection,
        scenario: scenario.label,
        scenarioId: isUuid(scenario.id) ? scenario.id : undefined,
        pitchText: spoken || undefined,
        mode: responseMode,
        durationSec: responseMode === "text" ? undefined : durationSec,
      }),
    }).catch(() => null);
    setCoaching(false);
    const body = (await response?.json().catch(() => null)) as
      | { tips?: string[]; scores?: PitchScoreRow[]; missed?: string[]; overTime?: boolean; source?: "ai" | "rules"; error?: string }
      | null;
    if (!response?.ok || !body?.tips) {
      toast.error(body?.error ?? "The AI review couldn't run just now.");
      return;
    }
    setCoachTips(body.tips);
    // Scores only ever come from the AI review; rule-based tips leave the rubric empty.
    setCoachScores(body.scores ?? []);
    setMissed(body.missed ?? []);
    setOverTime(Boolean(body.overTime));
    if (body.source === "rules") toast.message("AI isn't configured, so you got tips without scores.");
  }

  async function startRecording() {
    try {
      clearRecording();
      const wantsVideo = responseMode === "video";
      const stream = await navigator.mediaDevices.getUserMedia({ video: wantsVideo, audio: true });
      streamRef.current = stream;
      // The <video> only mounts once recording starts; the effect below attaches this stream to it.

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const nextBlob = new Blob(chunksRef.current, { type: wantsVideo ? "video/webm" : "audio/webm" });
        setBlob(nextBlob);
        setBlobUrl(URL.createObjectURL(nextBlob));
        setDurationSec(Math.round((Date.now() - startedAtRef.current) / 1000));
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      };

      mediaRecorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setElapsed(0);
      recorder.start();
      setRecording(true);
      toast.message(`Recording. ${scenario.description}`);
    } catch {
      toast.error(responseMode === "video" ? "Camera and microphone permission required." : "Microphone permission required.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  function discardRecording() {
    clearRecording();
    toast.message("Recording discarded. Start again when you're ready.");
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

    const kind = responseMode === "voice" ? "voice" : "pitch";
    const evidencePath = `${user.id}/${Date.now()}-${kind}.webm`;
    const { error: uploadError } = await supabase.storage.from("evidence").upload(evidencePath, blob, {
      contentType: responseMode === "voice" ? "audio/webm" : "video/webm",
    });
    if (uploadError) {
      toast.error(uploadError.message);
      return null;
    }

    return { evidencePath };
  }

  function hasAnswer() {
    return responseMode === "text" ? wordCount(typedPitch) >= 8 : Boolean(blob);
  }

  async function savePractice() {
    if (!reflection.trim() && !hasAnswer()) {
      toast.error(responseMode === "text" ? "Type your pitch before saving." : "Record or add a reflection before saving.");
      return;
    }

    setUploading(true);
    const uploaded = responseMode !== "text" && blob ? await uploadEvidence() : null;
    if (responseMode !== "text" && blob && !uploaded) {
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
        scenarioId: isUuid(scenario.id) ? scenario.id : undefined,
        aiScores: coachScores.length > 0 ? coachScores : undefined,
        responseMode,
        transcript: pitchText || undefined,
        durationSec: responseMode === "text" ? undefined : durationSec,
      }),
    });

    setUploading(false);
    if (!response.ok) {
      toast.error("Could not save practice session.");
      return;
    }

    setSavedPractice(true);
    toast.success("Practice saved. Your manager was not notified.");
  }

  async function submitForReview() {
    if (!hasAnswer()) {
      toast.error(responseMode === "text" ? "Type your pitch before submitting." : "Record a pitch before submitting.");
      return;
    }

    if (studioMode === "assigned" && !selectedQueueSlotId) {
      toast.error("Select an assigned queue slot first.");
      return;
    }

    setUploading(true);
    // Give the reviewer the words as well as the recording; a failed transcription doesn't block.
    const words = responseMode === "text" ? typedPitch.trim() : (transcript || (await ensureTranscript()) || "");
    const uploaded = responseMode === "text" ? null : await uploadEvidence();
    if (responseMode !== "text" && !uploaded) {
      setUploading(false);
      return;
    }

    const response = await fetch("/api/pitch/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `${scenario.label}: ${title}`,
        evidencePath: uploaded?.evidencePath,
        reflectionText: reflection || undefined,
        targetType: "certification",
        scenarioId: isUuid(scenario.id) ? scenario.id : undefined,
        queueSlotId: selectedQueueSlotId ?? undefined,
        responseMode,
        transcript: words || undefined,
        durationSec: responseMode === "text" ? undefined : durationSec,
      }),
    });

    setUploading(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      toast.error(body?.error ?? "Pitch upload failed.");
      return;
    }

    toast.success("Pitch submitted for manager review.");
    clearRecording();
    setTypedPitch("");
    setReflection("");
    await loadQueue({ reselectFirst: true });
  }

  const statusLabel = recording ? `Recording ${formatClock(elapsed)}` : blobUrl ? "Ready to review" : "Standby";
  const showCamera = responseMode === "video" && (recording || blobUrl);
  const reviewingVideo = responseMode === "video" && Boolean(blobUrl) && !recording;
  const selectedSlotPending = Boolean(queue.find((s) => s.id === selectedQueueSlotId)?.submissionId);
  const typedWords = wordCount(typedPitch);
  const typedSeconds = Math.round(typedWords / 2.5);
  const busy = coaching || transcribing;

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
          <span className="ml-auto text-[13px] text-muted">
            {studioMode === "assigned" ? "Your manager reviews it when you submit." : "Private. Your manager isn't notified."}
          </span>
        </div>

        <div
          aria-label={studioMode === "assigned" ? "Queue slots" : "Scenarios"}
          className="flex shrink-0 flex-wrap items-center gap-2 border-b border-divider px-4 py-3 sm:px-5"
          role="group"
        >
          <span className="mr-1 text-sm font-bold text-ink">{studioMode === "assigned" ? "Queue slot" : "Scenario"}</span>
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
                  {slot.submissionId ? " (pending)" : ""}
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

        <div className="flex shrink-0 flex-wrap items-start gap-3 border-b border-divider bg-white px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <p className="label-caps label-caps--blue">{scenario.promptLabel}</p>
            <p className="mt-1 text-[15px] leading-[1.5] text-ink">&ldquo;{scenario.prompt}&rdquo;</p>
            {isDrill ? <p className="mt-1 text-[13px] text-muted">{scenario.description}</p> : null}
          </div>
          {scenario.responseModes.length > 1 ? (
            <SegmentedToggle
              label="Answer by"
              onChange={(id) => changeResponseMode(id as PitchResponseMode)}
              options={scenario.responseModes.map((mode) => ({ id: mode, label: PITCH_RESPONSE_MODE_LABELS[mode] }))}
              value={responseMode}
            />
          ) : null}
        </div>

        {responseMode === "text" ? (
          <div className="flex min-h-[280px] flex-1 flex-col gap-2 bg-white px-4 py-4 sm:px-5">
            <label className={LABEL_CLS} htmlFor={typedId}>
              Type your pitch as you would say it
            </label>
            <textarea
              className={cn(TEXTAREA_CLS, "min-h-[200px] flex-1 resize-y")}
              id={typedId}
              maxLength={4000}
              onChange={(event) => {
                setTypedPitch(event.target.value);
                if (coachScores.length) resetAttempt();
              }}
              placeholder="Lead with the buyer's problem, then how SailPoint fixes it, then a point of view or next step."
              value={typedPitch}
            />
            <span className={cn("text-[13px]", typedSeconds > scenario.maxDurationSec ? "text-danger" : "text-muted")}>
              <span className="num">{typedWords}</span> words · about <span className="num">{typedSeconds}</span> seconds spoken ·{" "}
              {formatMaxDuration(scenario.maxDurationSec)}
            </span>
          </div>
        ) : (
          <div className="relative flex min-h-[280px] flex-1 flex-col items-center justify-center overflow-hidden bg-ink sm:min-h-[320px]">
            <div
              className="absolute left-3 top-3 z-10 inline-flex items-center gap-[7px] rounded-full border border-blue-line bg-ink px-3 py-1 text-[13px] font-semibold text-white sm:left-3.5 sm:top-3.5"
              role="status"
            >
              <span aria-hidden className={cn("h-[7px] w-[7px] rounded-full", recording ? "bg-danger" : blobUrl ? "bg-signal" : "bg-on-blue-muted")} />
              <span className="num">{statusLabel}</span>
            </div>

            {showCamera ? (
              <video
                className="absolute inset-0 h-full w-full object-cover"
                controls={Boolean(blobUrl && !recording)}
                muted={!blobUrl || recording}
                playsInline
                preload="auto"
                ref={videoRef}
                src={blobUrl && !recording ? blobUrl : undefined}
              />
            ) : responseMode === "voice" ? (
              <div className="flex w-full max-w-[420px] flex-col items-center gap-3 px-4">
                <Mic aria-hidden="true" className={cn("h-9 w-9", recording ? "text-danger" : "text-on-blue-muted")} strokeWidth={1.5} />
                {recording ? (
                  <p className="num text-[28px] font-extrabold text-white">{formatClock(elapsed)}</p>
                ) : blobUrl ? (
                  <audio className="w-full" controls src={blobUrl} />
                ) : (
                  <>
                    <p className="mb-1 text-[13px] text-on-blue-muted">Microphone ready</p>
                    <p className="mb-6 text-center text-[13px] text-on-blue">Voice only, no camera. Press record and say your pitch.</p>
                  </>
                )}
              </div>
            ) : (
              <>
                <Video aria-hidden="true" className="mb-3 h-8 w-8 text-on-blue-muted" strokeWidth={1.5} />
                <p className="mb-1 text-[13px] text-on-blue-muted">Camera ready</p>
                <p className="mb-6 px-4 text-center text-[13px] text-on-blue">Allow camera access to begin recording</p>
              </>
            )}

            {/* While reviewing a video take, this row would sit on top of the player's own
                controls and swallow clicks on play and the timeline, so it steps aside.
                Discard (top right) clears the take and brings it back. */}
            {reviewingVideo ? null : (
            <div className="relative z-10 mt-auto flex w-full flex-wrap items-center justify-center gap-3 px-3 pb-4 sm:gap-4">
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
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-line px-3 py-1.5 text-[13px] text-on-blue-muted">
                <Clock aria-hidden="true" className="h-4 w-4" />
                {formatMaxDuration(scenario.maxDurationSec)}
              </span>
            </div>
            )}

            {blobUrl && !recording ? (
              <button
                className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-danger bg-danger-soft px-3 py-1 text-[13px] font-bold text-danger disabled:opacity-50 sm:right-3.5 sm:top-3.5"
                disabled={uploading}
                onClick={discardRecording}
                type="button"
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
                Discard and re-record
              </button>
            ) : null}
          </div>
        )}

        <div className="shrink-0 border-t border-divider bg-white px-4 py-4 sm:px-5">
          {transcript && responseMode !== "text" ? (
            <div className="mb-3 rounded-[10px] bg-bg px-3 py-2">
              <p className="label-caps">What we heard</p>
              <p className="mt-1 text-[14px] leading-relaxed text-ink">{transcript}</p>
            </div>
          ) : null}
          <label className={LABEL_CLS} htmlFor={reflectionId}>
            Reflection{" "}
            <span className="font-normal text-muted">
              {isDrill || responseMode === "text" ? "(optional)" : "(used for AI scoring if you don't record)"}
            </span>
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
              disabled={busy || recording}
              onClick={() => void runAiCoach()}
              type="button"
            >
              {busy ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
              {transcribing ? "Transcribing…" : isDrill ? "Score my pitch" : "Get AI coaching"}
            </button>
            {studioMode === "practice" ? (
              <button
                className="btn-primary ml-auto inline-flex items-center gap-2"
                disabled={uploading || recording}
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
                disabled={uploading || recording || !hasAnswer() || selectedSlotPending}
                onClick={() => void submitForReview()}
                type="button"
              >
                {uploading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
                Submit for review
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
        {isDrill && coachScores.length ? (
          <section className="flex flex-col gap-3 border-t border-divider px-5 py-4">
            <h3 className="label-caps">Compared with the guide</h3>
            {overTime ? (
              <p className="m-0 text-[14px] text-danger">
                You ran over the {scenario.maxDurationSec}-second limit. Cut to the problem, the outcome and one proof point.
              </p>
            ) : null}
            {missed.length ? (
              <>
                <p className="m-0 text-[14px] text-ink-2">Ideas from the guide you left out:</p>
                <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-[14px] text-ink">
                  {missed.map((idea) => (
                    <li key={idea}>{idea}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="m-0 text-[14px] text-ink-2">You covered the guide&apos;s key ideas.</p>
            )}
            {coachTips.length > 1 ? (
              <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-[14px] text-ink-2">
                {coachTips.slice(1).map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            ) : null}
            <button className="link self-start text-[14px]" onClick={() => setShowReference((value) => !value)} type="button">
              {showReference ? "Hide the guide's pitch" : "Show the guide's pitch"}
            </button>
            {showReference ? (
              <blockquote className="m-0 border-l-4 border-blue pl-3 text-[14px] leading-relaxed whitespace-pre-line text-ink">
                {scenario.referenceText}
              </blockquote>
            ) : null}
          </section>
        ) : null}
        {peerLibrary}
      </div>
    </div>
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
