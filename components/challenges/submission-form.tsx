"use client";

import { FileUp, Loader2 } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { FIELD_CLS, LABEL_CLS, LINE_CARD_CLS, TEXTAREA_CLS } from "@/components/se/form-classes";
import { createClient } from "@/lib/supabase/client";
import type { NextUpStep } from "@/lib/plans/next-up";

/** Matches the file_size_limit on the evidence storage bucket. */
const MAX_EVIDENCE_BYTES = 50 * 1024 * 1024;

export function ChallengeSubmissionForm({
  challengeId,
  defaultReflection = "",
  variant = "default",
  onSubmitted,
  reviewerName = "your manager",
}: {
  challengeId: string;
  /** Called after a successful turn-in, with the plan's next step when there is one. */
  onSubmitted?: (nextUp: NextUpStep | null) => void;
  reviewerName?: string;
  defaultReflection?: string;
  variant?: "default" | "handoff";
}) {
  const [reflection, setReflection] = useState(defaultReflection);
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const formId = useId();

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (file && file.size > MAX_EVIDENCE_BYTES) {
      const sizeMb = Math.ceil(file.size / (1024 * 1024));
      setFileError(`That file is ${sizeMb}MB and the limit is 50MB. Paste a link to it below instead.`);
      setEvidenceFile(null);
      event.target.value = "";
      return;
    }
    setFileError(null);
    setEvidenceFile(file);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!evidenceFile && !evidenceUrl) {
      toast.error("Upload a file or provide an evidence link.");
      return;
    }

    if (!confirmed) {
      toast.error("Confirm your manager can open it and that it has no customer data, passwords or keys.");
      return;
    }

    setIsSubmitting(true);

    let evidencePath = "";

    if (evidenceFile) {
      const supabase = createClient();

      if (!supabase) {
        toast.error("Storage not configured.");
        setIsSubmitting(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You must be signed in.");
        setIsSubmitting(false);
        return;
      }

      const safeName = evidenceFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      evidencePath = `${user.id}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage.from("evidence").upload(evidencePath, evidenceFile);

      if (uploadError) {
        toast.error(uploadError.message.includes("Bucket") ? "Run the Sprint 5 migration to enable uploads." : "Upload failed.");
        setIsSubmitting(false);
        return;
      }
    }

    const response = await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        challengeId,
        reflectionText: reflection,
        evidenceUrl,
        evidencePath,
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
      toast.error(typeof body?.error === "string" ? body.error : "Submission failed. Try again.");
      setIsSubmitting(false);
      return;
    }

    const body = (await response.json().catch(() => null)) as { nextUp?: NextUpStep | null } | null;
    toast.success("Submitted for manager review.");
    setEvidenceFile(null);
    setEvidenceUrl("");
    setIsSubmitting(false);
    onSubmitted?.(body?.nextUp ?? null);
  }

  const fileId = `${formId}-file`;
  const urlId = `${formId}-url`;
  const reflectionId = `${formId}-reflection`;
  const isHandoff = variant === "handoff";

  return (
    <form
      aria-labelledby={isHandoff ? `${formId}-title` : undefined}
      className={isHandoff ? `${LINE_CARD_CLS} overflow-hidden` : "space-y-4"}
      onSubmit={handleSubmit}
    >
      {isHandoff ? (
        <div className="border-b border-divider px-5 py-3.5">
          <h3 className="text-base font-bold text-ink" id={`${formId}-title`}>
            Turn in your work
          </h3>
          <p className="text-[13px] text-muted">Send your proof and a short reflection to {reviewerName}.</p>
        </div>
      ) : null}
      <div className={isHandoff ? "flex flex-col gap-4 p-5" : "flex flex-col gap-4"}>
        <div className="flex flex-col gap-1.5">
          <label className={LABEL_CLS} htmlFor={urlId}>
            Paste your link
          </label>
          <details className="text-[13px] text-muted">
            <summary className="cursor-pointer font-semibold text-blue">How to get a Teams video link</summary>
            <ol className="mt-1.5 list-decimal space-y-1 pl-5">
              <li>Start a Teams meeting by yourself, share your screen and record.</li>
              <li>End the meeting, then open the recording from the meeting chat.</li>
              <li>Select Share and allow people in your company to view it.</li>
              <li>Select Copy link and paste it here.</li>
            </ol>
          </details>
          <input
            className={FIELD_CLS}
            id={urlId}
            onChange={(event) => setEvidenceUrl(event.target.value)}
            placeholder="https://..."
            type="url"
            value={evidenceUrl}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={LABEL_CLS} htmlFor={fileId}>
            Or upload a file
          </label>
          <p className="text-[13px] text-muted" id={`${fileId}-hint`}>
            PDF, deck, image or video, max 50MB. For a video, a Teams link is better.
          </p>
          <label
            className="flex cursor-pointer flex-wrap items-center justify-between gap-2 rounded-[10px] border border-dashed border-line-strong bg-white px-4 py-3.5 hover:bg-blue-soft has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-blue"
          >
            <span className="inline-flex items-center gap-2 text-sm font-bold text-blue">
              <FileUp aria-hidden="true" className="h-4 w-4" />
              Choose file
            </span>
            <span className="text-[13px] text-muted">{evidenceFile?.name ?? "No file chosen"}</span>
            <input
              accept=".pdf,.png,.jpg,.jpeg,.webp,.mp4,.mov,.pptx,.txt"
              aria-describedby={`${fileId}-hint`}
              className="sr-only"
              id={fileId}
              onChange={handleFileChange}
              type="file"
            />
          </label>
          {fileError ? (
            <p className="text-[13px] text-danger" role="alert">
              {fileError}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={LABEL_CLS} htmlFor={reflectionId}>
            Reflection
          </label>
          <textarea
            className={`${TEXTAREA_CLS} min-h-[96px]`}
            id={reflectionId}
            onChange={(event) => setReflection(event.target.value)}
            placeholder="What did you do, what did you learn, and what would you change?"
            required
            value={reflection}
          />
        </div>
        <label className="flex items-start gap-2.5 text-sm text-ink">
          <input
            checked={confirmed}
            className="mt-0.5 h-5 w-5 shrink-0"
            onChange={(event) => setConfirmed(event.target.checked)}
            type="checkbox"
          />
          <span>{reviewerName} can open this, and it doesn&apos;t show any customer data, passwords or keys.</span>
        </label>
        <div>
          <button className="btn-primary inline-flex items-center gap-2" disabled={isSubmitting} type="submit">
            {isSubmitting ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? "Sending..." : `Send to ${reviewerName} for review`}
          </button>
        </div>
      </div>
    </form>
  );
}
