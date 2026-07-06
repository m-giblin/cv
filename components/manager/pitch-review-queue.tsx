"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type PitchRow = {
  id: string;
  user_id: string;
  title: string;
  evidence_path: string;
  reflection_text: string | null;
  status: string;
  created_at: string;
};

function PitchPlayback({ submissionId }: { submissionId: string }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const response = await fetch(`/api/pitch/submissions/${submissionId}/playback`);
      if (!response.ok) {
        setLoading(false);
        return;
      }
      const body = (await response.json()) as { signedUrl: string };
      setSignedUrl(body.signedUrl);
      setLoading(false);
    })();
  }, [submissionId]);

  if (loading) {
    return (
      <div className="flex min-h-24 items-center justify-center text-sp-navy-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!signedUrl) {
    return <p className="text-xs text-sp-navy-muted">Could not load video playback.</p>;
  }

  return (
    <video className="mt-3 w-full rounded-xl border border-sp-blue/10" controls preload="metadata" src={signedUrl}>
      <track kind="captions" />
    </video>
  );
}

export function PitchReviewQueue({ orgUserIds }: { orgUserIds: string[] }) {
  const [rows, setRows] = useState<PitchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [grades, setGrades] = useState<Record<string, number>>({});

  useEffect(() => {
    void (async () => {
      const responses = await Promise.all(
        orgUserIds.map((userId) => fetch(`/api/pitch/submissions?userId=${userId}&status=submitted`)),
      );
      const all: PitchRow[] = [];
      for (const response of responses) {
        if (!response.ok) continue;
        const body = (await response.json()) as { submissions: PitchRow[] };
        all.push(...body.submissions);
      }
      setRows(all);
      setLoading(false);
    })();
  }, [orgUserIds]);

  async function review(id: string, status: "reviewed" | "rejected") {
    const response = await fetch(`/api/pitch/submissions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        managerFeedback: feedback[id] ?? "",
        managerGrade: status === "reviewed" ? grades[id] ?? 4 : undefined,
      }),
    });
    if (!response.ok) {
      toast.error("Review failed.");
      return;
    }
    setRows((current) => current.filter((row) => row.id !== id));
    toast.success(status === "reviewed" ? "Pitch approved." : "Sent back to SE.");
  }

  if (loading) {
    return (
      <div className="flex min-h-24 items-center justify-center text-sp-navy-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (rows.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Video pitch review</CardTitle>
        <CardDescription>{rows.length} pitch recording{rows.length === 1 ? "" : "s"} awaiting review.</CardDescription>
      </CardHeader>
      <div className="space-y-3 px-6 pb-6">
        {rows.map((row) => (
          <div className="rounded-xl border border-sp-blue/10 p-4" key={row.id}>
            <p className="font-semibold text-sp-navy">{row.title}</p>
            <p className="text-xs text-sp-navy-muted">{new Date(row.created_at).toLocaleString()}</p>
            {row.reflection_text ? (
              <p className="mt-2 text-sm text-sp-navy-muted">{row.reflection_text}</p>
            ) : null}
            <PitchPlayback submissionId={row.id} />
            <div className="mt-3 flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((grade) => (
                <button
                  className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                    grades[row.id] === grade
                      ? "border-sp-blue bg-sp-blue-soft text-sp-blue-deep"
                      : "border-stone-200 text-stone-600"
                  }`}
                  key={grade}
                  onClick={() => setGrades((current) => ({ ...current, [row.id]: grade }))}
                  type="button"
                >
                  {grade}/5
                </button>
              ))}
            </div>
            <Textarea
              className="mt-3"
              onChange={(e) => setFeedback((current) => ({ ...current, [row.id]: e.target.value }))}
              placeholder="Manager feedback…"
              rows={2}
              value={feedback[row.id] ?? ""}
            />
            <div className="mt-2 flex gap-2">
              <Button onClick={() => void review(row.id, "reviewed")} size="sm" type="button">
                Approve
              </Button>
              <Button onClick={() => void review(row.id, "rejected")} size="sm" type="button" variant="outline">
                Send back
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
