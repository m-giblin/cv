"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  EmptyState,
  Field,
  LineCard,
  LineRow,
  LoadingState,
  SecondaryButton,
  TextArea,
} from "@/components/admin/admin-ui";
import { StatusPill } from "@/components/ui/status-pill";
import { Tag } from "@/components/ui/tag";

type FeedbackRow = {
  id: string;
  content_asset_id: string;
  user_id: string;
  is_confusing: boolean;
  comment: string | null;
  status: string;
  created_at: string;
  content_assets: { title: string } | null;
  profiles: { full_name: string; email: string } | null;
};

function slaTag(createdAt: string) {
  const hoursLeft = 48 - (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  const hours = Math.max(0, Math.round(hoursLeft));
  const label = hours === 0 ? "Overdue" : `${hours} ${hours === 1 ? "hour" : "hours"} left`;
  if (hoursLeft > 24) {
    return { label, tone: "success" as const };
  }
  if (hoursLeft > 8) {
    return { label, tone: "warning" as const };
  }
  return { label, tone: "danger" as const };
}

function formatTimeAgo(createdAt: string) {
  const hours = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

export function CorpusFeedbackAdmin() {
  const [items, setItems] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [smeAnswers, setSmeAnswers] = useState<Record<string, string>>({});
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/corpus/feedback");
    if (response.ok) {
      const body = (await response.json()) as { feedback: FeedbackRow[] };
      setItems(body.feedback ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function resolveItem(id: string) {
    setResolvingId(id);
    const response = await fetch(`/api/corpus/feedback/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "resolved",
        adminNote: notes[id]?.trim() || undefined,
        publishSmeAnswer: Boolean(smeAnswers[id]?.trim()),
        smeAnswer: smeAnswers[id]?.trim() || undefined,
      }),
    });
    setResolvingId(null);

    if (!response.ok) {
      toast.error("Could not resolve feedback.");
      return;
    }

    toast.success("Feedback resolved.");
    void load();
  }

  return (
    <LineCard
      actions={<Tag tone={items.length > 0 ? "warning" : "neutral"}>{items.length} waiting</Tag>}
      bodyClassName="p-0"
      meta="Lab questions that need an SME answer within 48 hours"
      title="SE feedback queue"
    >
      {loading ? (
        <LoadingState label="Loading feedback…" />
      ) : items.length === 0 ? (
        <EmptyState>No open feedback. You&apos;re caught up.</EmptyState>
      ) : (
        items.map((item) => {
          const sla = slaTag(item.created_at);
          const answerId = `feedback-answer-${item.id}`;
          const noteId = `feedback-note-${item.id}`;
          return (
            <LineRow className="flex flex-col gap-3 py-4" key={item.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink">
                    {item.comment ?? item.content_assets?.title ?? "No question provided."}
                  </p>
                  <p className="mt-0.5 text-[13px] text-muted">
                    {item.profiles?.full_name ?? "Unknown SE"}, {formatTimeAgo(item.created_at).toLowerCase()}.{" "}
                    {item.is_confusing ? "Flagged as confusing." : "Asked a question."}
                  </p>
                </div>
                <StatusPill tone={sla.tone}>{sla.label}</StatusPill>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field htmlFor={answerId} label="SME answer to publish (optional)">
                  <TextArea
                    className="min-h-0 resize-none"
                    id={answerId}
                    onChange={(event) => setSmeAnswers((current) => ({ ...current, [item.id]: event.target.value }))}
                    rows={2}
                    value={smeAnswers[item.id] ?? ""}
                  />
                </Field>
                <Field htmlFor={noteId} label="Admin note (optional)">
                  <TextArea
                    className="min-h-0 resize-none"
                    id={noteId}
                    onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))}
                    rows={2}
                    value={notes[item.id] ?? ""}
                  />
                </Field>
              </div>
              <div>
                <SecondaryButton disabled={resolvingId === item.id} onClick={() => void resolveItem(item.id)}>
                  {resolvingId === item.id ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
                  Answer and resolve
                </SecondaryButton>
              </div>
            </LineRow>
          );
        })
      )}
    </LineCard>
  );
}
