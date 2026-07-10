"use client";

import { FileUp, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

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

  if (variant === "handoff") {
    return (
      <form className="overflow-hidden border border-[#E2DFD9]" onSubmit={handleSubmit}>
        <div className="flex items-center gap-2 border-b border-[#ECEAE6] bg-[#F9F8F6] px-4 py-2.5">
          <FileUp className="h-3.5 w-3.5 text-[#0033A1]" strokeWidth={1.3} />
          <span className="text-xs font-semibold text-[#0D0E12]">Submit for review</span>
          <span className="text-[11px] text-[#6B6860]">
            Upload evidence and a short reflection — your manager is notified.
          </span>
        </div>
        <div className="flex flex-col gap-2.5 p-4">
          <div>
            <p className="mb-1 font-mono text-[8px] uppercase tracking-[0.1em] text-[#B0ADA8]">
              Upload evidence (PDF, deck, image, video — max 50MB)
            </p>
            <label className="flex cursor-pointer items-center justify-between border border-dashed border-[#D4D1CB] bg-[#FAFAF8] px-3.5 py-3.5">
              <span className="flex items-center gap-2 text-[11.5px] text-[#B0ADA8]">
                <FileUp className="h-4 w-4" strokeWidth={1.3} />
                Choose file
              </span>
              <span className="font-mono text-[9px] text-[#B0ADA8]">
                {evidenceFile?.name ?? "No file chosen"}
              </span>
              <input
                accept=".pdf,.png,.jpg,.jpeg,.webp,.mp4,.pptx,.txt"
                className="sr-only"
                onChange={(event) => setEvidenceFile(event.target.files?.[0] ?? null)}
                type="file"
              />
            </label>
          </div>
          <div>
            <p className="mb-1 font-mono text-[8px] uppercase tracking-[0.1em] text-[#B0ADA8]">
              Or paste an evidence link
            </p>
            <input
              className="w-full border border-[#E2DFD9] bg-[#F9F8F6] px-2.5 py-1.5 text-[11.5px] text-[#3D3C38] outline-none placeholder:text-[#B0ADA8]"
              onChange={(event) => setEvidenceUrl(event.target.value)}
              placeholder="https://..."
              type="url"
              value={evidenceUrl}
            />
          </div>
          <div>
            <p className="mb-1 font-mono text-[8px] uppercase tracking-[0.1em] text-[#B0ADA8]">Reflection</p>
            <textarea
              className="min-h-[52px] w-full resize-none border border-[#E2DFD9] bg-[#F9F8F6] px-2.5 py-2 text-[11.5px] leading-relaxed text-[#3D3C38] outline-none placeholder:text-[#B0ADA8]"
              onChange={(event) => setReflection(event.target.value)}
              placeholder="What did you learn? What would you do differently?"
              required
              value={reflection}
            />
          </div>
          <button
            className="inline-flex w-full items-center justify-center gap-1.5 bg-[#0033A1] px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-[#002878] disabled:opacity-50"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
            Submit for manager review
          </button>
        </div>
      </form>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <label className="block space-y-2 text-sm font-semibold text-sp-navy-muted">
        Upload evidence (PDF, deck, image, video — max 50MB)
        <Input
          accept=".pdf,.png,.jpg,.jpeg,.webp,.mp4,.pptx,.txt"
          onChange={(event) => setEvidenceFile(event.target.files?.[0] ?? null)}
          type="file"
        />
        {evidenceFile ? (
          <span className="inline-flex items-center gap-1 text-xs font-normal text-sp-blue">
            <FileUp className="h-3.5 w-3.5" />
            {evidenceFile.name}
          </span>
        ) : null}
      </label>
      <label className="block space-y-2 text-sm font-semibold text-sp-navy-muted">
        Or paste an evidence link
        <Input
          onChange={(event) => setEvidenceUrl(event.target.value)}
          placeholder="https://..."
          type="url"
          value={evidenceUrl}
        />
      </label>
      <label className="block space-y-2 text-sm font-semibold text-sp-navy-muted">
        Reflection
        <Textarea onChange={(event) => setReflection(event.target.value)} required value={reflection} />
      </label>
      <Button className={cn("w-full")} disabled={isSubmitting} type="submit">
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        Submit for manager review
      </Button>
    </form>
  );
}
