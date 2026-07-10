"use client";

import type { ReactNode } from "react";
import { Check, Clock, FileUp, Loader2, Trash2, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { PitchCoachingRail, type PitchScoreRow } from "@/components/pitch/pitch-coaching-rail";
import { SP_OUTLINE_BTN } from "@/components/se/sp-form-primitives";
import { PITCH_SCENARIOS, type PitchScenarioId } from "@/lib/pitch/pitch-scenarios";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function deriveScores(reflection: string, tipCount: number): PitchScoreRow[] {
  const len = reflection.trim().length;
  const base = Math.min(92, 68 + Math.floor(len / 8) - tipCount * 4);
  return [
    { label: "Clarity & structure", score: Math.max(55, base + 2) },
    { label: "Value articulation", score: Math.max(50, base - 4) },
    { label: "Confidence & pacing", score: Math.max(52, base) },
  ];
}

export function VideoPitchCapture({
  initialScenarioId,
  peerLibrary,
}: {
  initialScenarioId?: string;
  peerLibrary?: ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [recording, setRecording] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("Elevator pitch");
  const [reflection, setReflection] = useState("");
  const [scenarioId, setScenarioId] = useState<PitchScenarioId>(() => {
    if (initialScenarioId && PITCH_SCENARIOS.some((item) => item.id === initialScenarioId)) {
      return initialScenarioId as PitchScenarioId;
    }
    return PITCH_SCENARIOS[0]!.id;
  });
  const [targetType, setTargetType] = useState<"practice" | "certification" | "challenge">("practice");
  const [targetId, setTargetId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [coachTips, setCoachTips] = useState<string[]>([]);
  const [coachScores, setCoachScores] = useState<PitchScoreRow[]>([]);
  const [coaching, setCoaching] = useState(false);
  const [savedPractice, setSavedPractice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const scenario = PITCH_SCENARIOS.find((s) => s.id === scenarioId) ?? PITCH_SCENARIOS[0]!;

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
  }, [scenario.shortLabel]);

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

  function savePractice() {
    if (!reflection.trim() && !blob) {
      toast.error("Record or add a reflection before saving.");
      return;
    }
    setSavedPractice(true);
    toast.success("Practice saved locally — submit when you're ready.");
  }

  async function uploadPitch() {
    if (!blob) {
      toast.error("Record a pitch before submitting.");
      return;
    }
    setUploading(true);

    const supabase = createClient();
    if (!supabase) {
      toast.error("Storage not configured.");
      setUploading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Sign in required.");
      setUploading(false);
      return;
    }

    const evidencePath = `${user.id}/${Date.now()}-pitch.webm`;
    const { error: uploadError } = await supabase.storage.from("evidence").upload(evidencePath, blob, {
      contentType: "video/webm",
    });

    if (uploadError) {
      toast.error(uploadError.message);
      setUploading(false);
      return;
    }

    const response = await fetch("/api/pitch/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `${scenario.label}: ${title}`,
        evidencePath,
        reflectionText: reflection || undefined,
        targetType,
        targetId: targetId || undefined,
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
  }

  const statusLabel = recording ? "RECORDING" : blobUrl ? "REVIEW" : "STANDBY";
  const showCamera = recording || blobUrl;

  return (
    <div className="grid min-h-0 flex-1 bg-[#E2DFD9] lg:grid-cols-[1fr_340px]">
      {/* Left — recording workspace */}
      <div className="flex min-h-0 flex-col overflow-hidden border-r border-[#E2DFD9] bg-[#F5F4F0] pl-3">
        {/* Scenario selector strip */}
        <div className="flex shrink-0 flex-wrap items-center gap-2.5 border-b border-[#ECEAE6] bg-[#F9F8F6] px-5 py-3">
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#B0ADA8]">Scenario</span>
          {PITCH_SCENARIOS.map((item) => {
            const active = scenarioId === item.id;
            return (
              <button
                className={cn(
                  "border px-3 py-1 text-[10.5px] font-medium transition",
                  active
                    ? "border-[#00143A] bg-[#00143A] text-white"
                    : "border-[#E2DFD9] bg-white text-[#6B6860] hover:border-[#B0ADA8]",
                )}
                key={item.id}
                onClick={() => setScenarioId(item.id)}
                type="button"
              >
                {item.shortLabel}
              </button>
            );
          })}
        </div>

        {/* Camera area */}
        <div className="relative flex min-h-[320px] flex-1 flex-col items-center justify-center overflow-hidden bg-[#0A0A0E]">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)",
              backgroundSize: "80px 60px",
            }}
          />
          <div className="pointer-events-none absolute left-1/3 top-0 bottom-0 w-px bg-white/[0.04]" />
          <div className="pointer-events-none absolute left-2/3 top-0 bottom-0 w-px bg-white/[0.04]" />
          <div className="pointer-events-none absolute top-1/3 left-0 right-0 h-px bg-white/[0.04]" />
          <div className="pointer-events-none absolute top-2/3 left-0 right-0 h-px bg-white/[0.04]" />

          <div className="absolute left-3.5 top-3.5 flex items-center gap-1.5 border border-white/10 bg-black/50 px-2.5 py-1">
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
              <div className="mb-4 flex h-[100px] w-[100px] items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04]">
                <Video className="h-9 w-9 text-white/25" strokeWidth={1.2} />
              </div>
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-white/25">Camera ready</p>
              <p className="mb-7 text-xs text-white/40">Allow camera access to begin recording</p>
            </>
          )}

          <div className="relative z-10 flex items-center gap-3.5">
            <button
              className="inline-flex items-center gap-1.5 border border-white/12 bg-white/[0.08] px-3 py-1.5 text-[11px] text-white/50"
              disabled
              type="button"
            >
              <FileUp className="h-2.5 w-2.5" />
              Upload recording
            </button>
            {!recording ? (
              <button
                className="flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-white/15 bg-[#B83128] shadow-[0_0_0_6px_rgba(184,49,40,0.2)]"
                onClick={() => void startRecording()}
                type="button"
              >
                <span className="h-5 w-5 rounded-full bg-white" />
              </button>
            ) : (
              <button
                className="flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-white/15 bg-[#B83128]"
                onClick={stopRecording}
                type="button"
              >
                <span className="h-4 w-4 bg-white" />
              </button>
            )}
            <button
              className="inline-flex items-center gap-1.5 border border-white/12 bg-white/[0.08] px-3 py-1.5 text-[11px] text-white/50"
              type="button"
            >
              <Clock className="h-2.5 w-2.5" />
              1:00 max
            </button>
          </div>

          {blobUrl && !recording ? (
            <button
              className="absolute right-3.5 top-3.5 z-10 inline-flex items-center gap-1 border border-[#fecaca]/40 bg-[#fee2e2]/90 px-2.5 py-1 text-[11px] font-semibold text-[#dc2626]"
              disabled={uploading}
              onClick={discardRecording}
              type="button"
            >
              <Trash2 className="h-3 w-3" />
              Discard
            </button>
          ) : null}

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 to-transparent px-5 py-3">
            <p className="mb-1 font-mono text-[8.5px] uppercase tracking-[0.1em] text-white/40">
              {scenario.promptLabel}
            </p>
            <p className="text-xs leading-relaxed text-white/80">&ldquo;{scenario.prompt}&rdquo;</p>
          </div>
        </div>

        {/* Reflection + actions */}
        <div className="shrink-0 border-t border-[#E2DFD9] bg-white px-5 py-3.5">
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
          {targetType !== "practice" ? (
            <input
              className="mt-2 w-full border border-[#E2DFD9] px-3 py-1.5 text-[11px]"
              onChange={(e) => setTargetId(e.target.value)}
              placeholder="Target ID (cert type or challenge ID)"
              value={targetId}
            />
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button className={SP_OUTLINE_BTN} onClick={savePractice} type="button">
              {savedPractice ? <Check className="mr-1 h-3 w-3" /> : null}
              Save practice
            </button>
            <button
              className="inline-flex items-center border border-[#0071CE] bg-[#0071CE] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#005bb5]"
              disabled={coaching}
              onClick={() => void runAiCoach()}
              type="button"
            >
              {coaching ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              Get AI coaching →
            </button>
            <button
              className="ml-auto inline-flex items-center bg-[#0033A1] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#002878] disabled:opacity-50"
              disabled={uploading || !blob}
              onClick={() => void uploadPitch()}
              type="button"
            >
              {uploading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              Submit for review →
            </button>
          </div>
        </div>
      </div>

      {/* Right — coaching + peer library */}
      <div className="min-h-0 overflow-y-auto bg-[#F9F8F6]">
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
