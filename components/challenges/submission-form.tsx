"use client";

import { FileUp, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

export function ChallengeSubmissionForm({
  challengeId,
  defaultReflection = "",
}: {
  challengeId: string;
  defaultReflection?: string;
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
      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        Submit for manager review
      </Button>
    </form>
  );
}
