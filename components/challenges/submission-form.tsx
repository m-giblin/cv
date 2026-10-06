"use client";

import { FileUp, Loader2 } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { FIELD_CLS, LABEL_CLS, LINE_CARD_CLS, TEXTAREA_CLS } from "@/components/se/form-classes";
import { createClient } from "@/lib/supabase/client";

export function ChallengeSubmissionForm({
  challengeId,
  defaultReflection = "",
  variant = "default",
}: {
  challengeId: string;
  defaultReflection?: string;
  variant?: "default" | "handoff";
}) {
  const [reflection, setReflection] = useState(defaultReflection);
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formId = useId();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!evidenceFile && !evidenceUrl) {
      toast.error("Upload a file or provide an evidence link.");
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
      toast.error("Submission failed. Try again.");
      setIsSubmitting(false);
      return;
    }

    toast.success("Submitted for manager review.");
    setEvidenceFile(null);
    setEvidenceUrl("");
    setIsSubmitting(false);
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
            Submit for review
          </h3>
          <p className="text-[13px] text-muted">Upload evidence and a short reflection. Your manager is notified.</p>
        </div>
      ) : null}
      <div className={isHandoff ? "flex flex-col gap-4 p-5" : "flex flex-col gap-4"}>
        <div className="flex flex-col gap-1.5">
          <label className={LABEL_CLS} htmlFor={fileId}>
            Upload evidence
          </label>
          <p className="text-[13px] text-muted" id={`${fileId}-hint`}>
            PDF, deck, image or video, max 50MB.
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
              accept=".pdf,.png,.jpg,.jpeg,.webp,.mp4,.pptx,.txt"
              aria-describedby={`${fileId}-hint`}
              className="sr-only"
              id={fileId}
              onChange={(event) => setEvidenceFile(event.target.files?.[0] ?? null)}
              type="file"
            />
          </label>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={LABEL_CLS} htmlFor={urlId}>
            Or paste an evidence link
          </label>
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
          <label className={LABEL_CLS} htmlFor={reflectionId}>
            Reflection
          </label>
          <textarea
            className={`${TEXTAREA_CLS} min-h-[96px]`}
            id={reflectionId}
            onChange={(event) => setReflection(event.target.value)}
            placeholder="What did you learn? What would you do differently?"
            required
            value={reflection}
          />
        </div>
        <div>
          <button className="btn-primary inline-flex items-center gap-2" disabled={isSubmitting} type="submit">
            {isSubmitting ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? "Submitting..." : "Submit for review"}
          </button>
        </div>
      </div>
    </form>
  );
}
