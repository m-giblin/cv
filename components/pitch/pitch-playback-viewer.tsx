"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { CARD_CLS, H2_CLS } from "@/components/se/form-classes";

const EMPTY_CLS =
  "rounded-[14px] border border-dashed border-line-strong p-7 text-center text-[15px] text-muted";

export function PitchPlaybackViewer({ submissionId }: { submissionId: string }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const response = await fetch(`/api/pitch/submissions/${submissionId}/playback`);
      if (!response.ok) {
        setLoading(false);
        return;
      }
      const body = (await response.json()) as { signedUrl: string; title: string };
      setSignedUrl(body.signedUrl);
      setTitle(body.title);
      setLoading(false);
    })();
  }, [submissionId]);

  if (loading) {
    return (
      <div className={`${EMPTY_CLS} flex items-center justify-center gap-2`} role="status">
        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        Loading pitch…
      </div>
    );
  }

  if (!signedUrl) {
    return (
      <p className={EMPTY_CLS} role="status">
        Could not load this pitch.
      </p>
    );
  }

  return (
    <div className={CARD_CLS}>
      <div className="border-b border-divider px-5 py-4">
        <p className="label-caps">Peer pitch</p>
        <h2 className={`${H2_CLS} mt-1`}>{title}</h2>
        <p className="mt-1 text-sm text-ink-2">Study the structure and the delivery.</p>
      </div>
      <div className="flex justify-center p-5">
        <video
          className="aspect-video w-full max-w-[560px] rounded-[10px] border border-line bg-ink object-cover"
          controls
          preload="metadata"
          src={signedUrl}
        >
          <track kind="captions" />
        </video>
      </div>
    </div>
  );
}
