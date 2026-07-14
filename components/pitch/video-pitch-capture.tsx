"use client";

import type { ReactNode } from "react";
import { Check, Clock, FileUp, Loader2, Trash2, Video } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { PitchCoachingRail, type PitchScoreRow } from "@/components/pitch/pitch-coaching-rail";
import { SP_OUTLINE_BTN } from "@/components/se/sp-form-primitives";
import { PITCH_SCENARIOS } from "@/lib/pitch/pitch-scenarios";
import type { PitchQueueSlot, PitchScenarioRow } from "@/lib/pitch/pitch-queue";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type StudioMode = "assigned" | "practice";

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
  const showCamera = recording || blobUrl;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#E2DFD9] lg:grid lg:grid-cols-[1fr_340px]">
      <div className="flex min-h-0 min-h-[50vh] flex-col overflow-hidden border-b border-[#E2DFD9] bg-[#F5F4F0] lg:min-h-0 lg:border-b-0 lg:border-r">
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[#ECEAE6] bg-[#F9F8F6] px-4 py-3 sm:px-5">
          <button
            className={cn(
              "border px-3 py-1.5 text-[10.5px] font-semibold transition",
              studioMode === "assigned"
                ? "border-[#00143A] bg-[#00143A] text-white"
                : "border-[#E2DFD9] bg-white text-[#6B6860]",
            )}
            onClick={switchToAssigned}
            type="button"
          >
            Assigned queue
          </button>
          <button
            className={cn(
              "border px-3 py-1.5 text-[10.5px] font-semibold transition",
              studioMode === "practice"
                ? "border-[#00143A] bg-[#00143A] text-white"
                : "border-[#E2DFD9] bg-white text-[#6B6860]",
            )}
            onClick={switchToPractice}
            type="button"
          >
            Free practice
          </button>
          <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.1em] text-[#B0ADA8]">
            {studioMode === "assigned" ? "Manager review on submit" : "Private — no manager notify"}
          </span>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[#ECEAE6] bg-[#F9F8F6] px-4 py-3 sm:px-5">
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#B0ADA8]">
            {studioMode === "assigned" ? "Queue slot" : "Scenario"}
          </span>
          {studioMode === "assigned" && loadingQueue ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#6B6860]" />
          ) : null}
          {studioMode === "assigned"
            ? queue.map((slot) => {
                const active = selectedQueueSlotId === slot.id;
                return (
                  <button
                    className={cn(
                      "border px-3 py-1 text-[10.5px] font-medium transition",
                      active
                        ? "border-[#00143A] bg-[#00143A] text-white"
                        : "border-[#E2DFD9] bg-white text-[#6B6860] hover:border-[#B0ADA8]",
                      slot.submissionId ? "opacity-60" : "",
                    )}
                    disabled={Boolean(slot.submissionId)}
                    key={slot.id}
                    onClick={() => selectAssignedSlot(slot)}
                    type="button"
                  >
                    Slot {slot.slot}: {slot.scenario.shortLabel}
                    {slot.submissionId ? " · pending" : ""}
                  </button>
                );
              })
            : practiceScenarios.map((item) => {
                const active = selectedScenarioId === item.id;
                return (
                  <button
                    className={cn(
                      "border px-3 py-1 text-[10.5px] font-medium transition",
                      active
                        ? "border-[#00143A] bg-[#00143A] text-white"
                        : "border-[#E2DFD9] bg-white text-[#6B6860] hover:border-[#B0ADA8]",
                    )}
                    key={item.id}
                    onClick={() => selectPracticeScenario(item.id)}
                    type="button"
                  >
                    {item.shortLabel}
                  </button>
                );
              })}
        </div>

        <div className="relative flex min-h-[280px] flex-1 flex-col items-center justify-center overflow-hidden bg-[#0A0A0E] sm:min-h-[320px]">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)",
              backgroundSize: "80px 60px",
            }}
          />

          <div className="absolute left-3 top-3 flex items-center gap-1.5 border border-white/10 bg-black/50 px-2.5 py-1 sm:left-3.5 sm:top-3.5">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                recording ? "animate-pulse bg-[#B83128]" : "bg-[#B83128]",
              )}
            />
            <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-white/60">{statusLabel}</span>
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
              <div className="mb-4 flex h-[80px] w-[80px] items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] sm:h-[100px] sm:w-[100px]">
                <Video className="h-8 w-8 text-white/25 sm:h-9 sm:w-9" strokeWidth={1.2} />
              </div>
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-white/25">Camera ready</p>
              <p className="mb-7 px-4 text-center text-xs text-white/40">Allow camera access to begin recording</p>
            </>
          )}

          <div className="relative z-10 flex flex-wrap items-center justify-center gap-2 px-3 sm:gap-3.5">
            <button
              className="inline-flex items-center gap-1.5 border border-white/12 bg-white/[0.08] px-3 py-1.5 text-[11px] text-white/50"
              disabled
              type="button"
            >
              <FileUp className="h-2.5 w-2.5" />
              Upload
            </button>
            {!recording ? (
              <button
                className="flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-white/15 bg-[#B83128] shadow-[0_0_0_6px_rgba(184,49,40,0.2)] sm:h-16 sm:w-16"
                onClick={() => void startRecording()}
                type="button"
              >
                <span className="h-4 w-4 rounded-full bg-white sm:h-5 sm:w-5" />
              </button>
            ) : (
              <button
                className="flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-white/15 bg-[#B83128] sm:h-16 sm:w-16"
                onClick={stopRecording}
                type="button"
              >
                <span className="h-3.5 w-3.5 bg-white sm:h-4 sm:w-4" />
              </button>
            )}
            <button
              className="inline-flex items-center gap-1.5 border border-white/12 bg-white/[0.08] px-3 py-1.5 text-[11px] text-white/50"
              type="button"
            >
              <Clock className="h-2.5 w-2.5" />
              {formatMaxDuration(scenario.maxDurationSec)}
            </button>
          </div>

          {blobUrl && !recording ? (
            <button
              className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 border border-[#fecaca]/40 bg-[#fee2e2]/90 px-2.5 py-1 text-[11px] font-semibold text-[#dc2626] sm:right-3.5 sm:top-3.5"
              disabled={uploading}
              onClick={discardRecording}
              type="button"
            >
              <Trash2 className="h-3 w-3" />
              Discard
            </button>
          ) : null}

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 to-transparent px-4 py-3 sm:px-5">
            <p className="mb-1 font-mono text-[8.5px] uppercase tracking-[0.1em] text-white/40">
              {scenario.promptLabel}
            </p>
            <p className="text-xs leading-relaxed text-white/80">&ldquo;{scenario.prompt}&rdquo;</p>
          </div>
        </div>

        <div className="shrink-0 border-t border-[#E2DFD9] bg-white px-4 py-3.5 sm:px-5">
          <p className="mb-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-[#B0ADA8]">
            Reflection (required for AI scoring)
          </p>
          <Textarea
            className="min-h-[40px] resize-none border-[#E2DFD9] bg-[#F9F8F6] text-[11.5px] leading-relaxed text-[#6B6860]"
            onChange={(e) => setReflection(e.target.value)}
            placeholder="What story structure did you use? What would you change?"
            rows={2}
            value={reflection}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {studioMode === "practice" ? (
              <button className={SP_OUTLINE_BTN} disabled={uploading} onClick={() => void savePractice()} type="button">
                {savedPractice ? <Check className="mr-1 h-3 w-3" /> : null}
                Save practice
              </button>
            ) : null}
            <button
              className="inline-flex items-center border border-[#0071CE] bg-[#0071CE] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#005bb5]"
              disabled={coaching}
              onClick={() => void runAiCoach()}
              type="button"
            >
              {coaching ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              Get AI coaching →
            </button>
            {studioMode === "assigned" ? (
              <button
                className="ml-auto inline-flex items-center bg-[#0033A1] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#002878] disabled:opacity-50"
                disabled={uploading || !blob || Boolean(queue.find((s) => s.id === selectedQueueSlotId)?.submissionId)}
                onClick={() => void submitForReview()}
                type="button"
              >
                {uploading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                Submit for review →
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="max-h-[45vh] min-h-0 overflow-y-auto bg-[#F9F8F6] lg:max-h-none">
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
