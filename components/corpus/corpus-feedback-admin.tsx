"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { SP_BLUE_BTN, SP_OUTLINE_BTN } from "@/components/se/sp-form-primitives";
import { Textarea } from "@/components/ui/textarea";

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

function slaBadge(createdAt: string) {
  const hoursLeft = 48 - (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  if (hoursLeft > 24) {
    return { sla: `${Math.round(hoursLeft)}h left`, slaBg: "#dcfce7", slaColor: "#15803d" };
  }
  if (hoursLeft > 8) {
    return { sla: `${Math.round(hoursLeft)}h left`, slaBg: "#fef3c7", slaColor: "#b45309" };
  }
  return {
    sla: `${Math.max(0, Math.round(hoursLeft))}h left`,
    slaBg: "#fee2e2",
    slaColor: "#dc2626",
  };
}

function formatTimeAgo(createdAt: string) {
  const hours = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
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
    <div className="overflow-hidden rounded-xl border border-[#e2eaf5] bg-white">
      <div className="flex items-center justify-between border-b border-[#f1f5f9] px-[18px] py-3">
        <div>
          <p className="text-[12.5px] font-bold text-[#0a1628]">SE feedback queue</p>
          <p className="text-[10.5px] text-[#94a3b8]">Questions SEs asked in ISC Lab that need SME answers</p>
        </div>
        <span className="rounded-full bg-[#fdf0fa] px-[8px] py-[2px] text-[9.5px] font-bold text-[#a51e8e]">
          {items.length} pending · 48h SLA
        </span>
      </div>
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-[#94a3b8]" />
        </div>
      ) : items.length === 0 ? (
        <p className="px-[18px] py-8 text-center text-sm text-[#94a3b8]">No open feedback — you&apos;re caught up.</p>
      ) : (
        items.map((item) => {
          const sla = slaBadge(item.created_at);
          return (
            <div
              className="flex items-start gap-[12px] border-b border-[#f9fafb] px-[18px] py-[11px] transition hover:bg-[#f7fafd] last:border-b-0"
              key={item.id}
            >
              <div className="min-w-0 flex-1">
                <p className="mb-[3px] text-[12px] font-semibold text-[#1e293b]">
                  {item.comment ?? item.content_assets?.title ?? "No question provided."}
                </p>
                <p className="text-[10.5px] text-[#94a3b8]">
                  {item.profiles?.full_name ?? "Unknown SE"} · {formatTimeAgo(item.created_at)} · Mode:{" "}
                  {item.is_confusing ? "Confusing" : "Question"}
                </p>
                <Textarea
                  className="mt-[10px] resize-none bg-white text-[12px]"
                  onChange={(event) => setSmeAnswers((current) => ({ ...current, [item.id]: event.target.value }))}
                  placeholder="Draft SME answer to publish (optional)"
                  rows={2}
                  value={smeAnswers[item.id] ?? ""}
                />
                <Textarea
                  className="mt-[8px] resize-none bg-white text-[12px]"
                  onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))}
                  placeholder="Admin note (optional)"
                  rows={2}
                  value={notes[item.id] ?? ""}
                />
              </div>
              <div className="flex flex-shrink-0 items-center gap-[6px]">
                <span
                  className="rounded-full px-[8px] py-[2px] text-[9.5px] font-bold"
                  style={{ background: sla.slaBg, color: sla.slaColor }}
                >
                  {sla.sla}
                </span>
                <button
                  className={`${SP_BLUE_BTN} px-[10px] py-[5px] text-[11px]`}
                  disabled={resolvingId === item.id}
                  onClick={() => void resolveItem(item.id)}
                  type="button"
                >
                  {resolvingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Answer & publish"}
                </button>
                <button className={`${SP_OUTLINE_BTN} px-[10px] py-[5px] text-[11px]`} type="button">
                  Escalate SME
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
