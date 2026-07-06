"use client";

import { FileUp, Loader2, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SP_OUTLINE_BTN } from "@/components/se/sp-form-primitives";
import { PITCH_SCENARIOS, type PitchScenarioId } from "@/lib/pitch/pitch-scenarios";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/** 16:9 frame — fills column width in side-by-side layout */
const PITCH_VIDEO_CLS =
  "aspect-video w-full rounded-xl bg-slate-900 object-cover shadow-[0_2px_12px_rgba(0,0,0,0.2)]";

export function VideoPitchCapture({ initialScenarioId }: { initialScenarioId?: string }) {
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
  const [coaching, setCoaching] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const scenario = PITCH_SCENARIOS.find((s) => s.id === scenarioId) ?? PITCH_SCENARIOS[0]!;

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  useEffect(() => {
    setTitle(scenario.label);
  }, [scenario.label]);

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
  }

  async function startRecording() {
    try {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlob(null);
        setBlobUrl(null);
        setCoachTips([]);
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
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream | null;
      stream?.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      videoRef.current.removeAttribute("src");
      videoRef.current.load();
    }
    toast.message("Recording discarded — start again when you're ready.");
  }

  async function uploadPitch() {
    if (!blob) return;
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
  }

  const waveformBars = [
    { h: 20, opacity: 0.42 },
    { h: 34, opacity: 0.56 },
    { h: 50, opacity: 0.88 },
    { h: 28, opacity: 0.5 },
    { h: 62, opacity: 1 },
    { h: 44, opacity: 0.8 },
    { h: 30, opacity: 0.52 },
    { h: 54, opacity: 0.92 },
    { h: 24, opacity: 0.45 },
    { h: 38, opacity: 0.68 },
  ];

  return (
    <div className="grid gap-[18px] lg:grid-cols-2 lg:items-start">
      {/* Left — topic picker, record controls, live preview / playback */}
      <div
        className="flex flex-col overflow-hidden rounded-2xl"
        style={{ background: "linear-gradient(135deg,#1a0a12,#3b0a24)" }}
      >
        <div className="flex flex-1 flex-col gap-[18px] p-[24px]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="font-display text-[16px] font-extrabold text-white">Record a new pitch</p>
              <p className="mt-1 text-[12px] text-white/55">
                Choose a topic, hit record, and get instant AI coaching feedback
              </p>
            </div>
            <div
              className="hidden h-[80px] w-[100px] shrink-0 items-center justify-center gap-[3px] rounded-[10px] border sm:flex"
              style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.1)" }}
            >
              {waveformBars.map((bar, index) => (
                <div
                  className="w-[3px] rounded-sm"
                  key={index}
                  style={{ height: `${bar.h}px`, background: `rgba(204,39,176,${bar.opacity})` }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-[8px]">
            {PITCH_SCENARIOS.map((item) => (
              <button
                className="rounded-full border px-[13px] py-[6px] text-[11.5px] font-semibold transition"
                key={item.id}
                onClick={() => setScenarioId(item.id)}
                style={
                  scenarioId === item.id
                    ? {
                        background: "rgba(204,39,176,0.25)",
                        color: "#f9a8d4",
                        borderColor: "rgba(204,39,176,0.4)",
                      }
                    : {
                        background: "rgba(255,255,255,0.07)",
                        color: "rgba(255,255,255,0.6)",
                        borderColor: "rgba(255,255,255,0.1)",
                      }
                }
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="relative w-full">
            {!recording && !blobUrl ? (
              <div
                className={cn(
                  PITCH_VIDEO_CLS,
                  "absolute inset-0 z-10 flex items-center justify-center border border-dashed border-white/20 bg-black/20",
                )}
              >
                <p className="px-4 text-center text-[12px] leading-relaxed text-white/45">
                  Camera preview appears when you hit Start recording
                </p>
              </div>
            ) : null}
            <video
              className={cn(PITCH_VIDEO_CLS, !recording && !blobUrl && "opacity-0")}
              controls={Boolean(blobUrl && !recording)}
              muted={!blobUrl || recording}
              playsInline
              ref={videoRef}
              src={blobUrl && !recording ? blobUrl : undefined}
            />
          </div>

          <div className="flex flex-wrap items-center gap-[9px]">
            {!recording ? (
              <button
                className="inline-flex items-center gap-[7px] rounded-lg bg-[#cc27b0] px-[18px] py-[9px] text-[12.5px] font-semibold text-white hover:bg-[#a51e8e]"
                onClick={() => void startRecording()}
                type="button"
              >
                <span className="h-[10px] w-[10px] rounded-full bg-white" />
                Start recording
              </button>
            ) : (
              <button
                className="inline-flex items-center gap-[7px] rounded-lg bg-red-600 px-[18px] py-[9px] text-[12.5px] font-semibold text-white hover:bg-red-700"
                onClick={stopRecording}
                type="button"
              >
                Stop recording
              </button>
            )}
            {blobUrl && !recording ? (
              <button
                className="inline-flex items-center gap-[6px] rounded-lg border border-[#fecaca]/40 bg-[#fee2e2]/90 px-[14px] py-[8px] text-[12px] font-semibold text-[#dc2626] transition hover:bg-[#fecaca]"
                disabled={uploading}
                onClick={discardRecording}
                type="button"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete & try again
              </button>
            ) : null}
            {recording ? (
              <span className="flex items-center gap-2 text-[11.5px] font-semibold text-[#f9a8d4]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                Recording…
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Right — scenario context, metadata, submit */}
      <div className="overflow-hidden rounded-xl border border-[#e2eaf5] bg-white">
        <div className="space-y-4 p-[16px_18px]">
          <div>
            <p className="text-[12.5px] leading-relaxed text-[#64748b]">{scenario.description}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {scenario.competencies.map((comp) => (
                <Badge key={comp} tone="blue">
                  {comp}
                </Badge>
              ))}
            </div>
          </div>

          <label className="block space-y-1 text-sm font-semibold text-sp-navy">
            Pitch title
            <Input onChange={(e) => setTitle(e.target.value)} value={title} />
          </label>

          <label className="block space-y-1 text-sm font-semibold text-sp-navy">
            Route to
            <select
              className="w-full rounded-lg border border-sp-blue/15 px-3 py-2 text-sm"
              onChange={(e) => setTargetType(e.target.value as typeof targetType)}
              value={targetType}
            >
              <option value="practice">Practice (manager review)</option>
              <option value="certification">Certification evidence</option>
              <option value="challenge">Challenge evidence</option>
            </select>
          </label>

          {targetType !== "practice" ? (
            <label className="block space-y-1 text-sm font-semibold text-sp-navy">
              Target ID (cert type or challenge ID)
              <Input onChange={(e) => setTargetId(e.target.value)} placeholder="e.g. mcp_governance" value={targetId} />
            </label>
          ) : null}

          <label className="block space-y-1 text-sm font-semibold text-sp-navy">
            Storyline reflection (required for AI coach)
            <Textarea
              onChange={(e) => setReflection(e.target.value)}
              placeholder="Pain → SailPoint outcome → proof → next step…"
              rows={4}
              value={reflection}
            />
          </label>

          {coachTips.length > 0 ? (
            <div className="rounded-xl border border-sp-magenta/20 bg-sp-magenta/5 p-3 text-sm">
              <p className="flex items-center gap-1 font-semibold text-sp-navy">
                <Sparkles className="h-4 w-4 text-sp-magenta" />
                AI coach — before you submit
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sp-navy-muted">
                {coachTips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-[9px] border-t border-[#f1f5f9] pt-4">
            <button
              className={SP_OUTLINE_BTN}
              disabled={coaching}
              onClick={() => void runAiCoach()}
              type="button"
            >
              {coaching ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
              AI coach check
            </button>
            {blob ? (
              <button
                className={SP_OUTLINE_BTN}
                disabled={uploading}
                onClick={() => void uploadPitch()}
                type="button"
              >
                {uploading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <FileUp className="mr-1 h-4 w-4" />}
                Submit for review
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
