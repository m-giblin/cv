"use client";

import { Loader2, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { HandoffCard } from "@/components/dashboard/handoff-practice-layout";
import { HandoffMetricStrip } from "@/components/dashboard/handoff-section-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Rule = {
  id: string;
  tag: string;
  destination_type: string;
  destination_address: string;
  label: string | null;
};

type QaInquiry = {
  id: string;
  question: string;
  created_at: string;
  routed_destination_type: string | null;
  routed_destination_address: string | null;
  escalated_at: string | null;
  profiles: { full_name: string; email: string } | null;
  sla: { label: string; bg?: string; color?: string; className?: string };
  elapsedHours: number;
};

const ROUTING_COLS = "160px 1fr 120px 70px 70px 140px";

function elapsedColor(hours: number) {
  if (hours > 36) return "#ef4444";
  if (hours >= 24) return "#f59e0b";
  return "#64748b";
}

export function CorpusRoutingAdmin() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [inquiries, setInquiries] = useState<QaInquiry[]>([]);
  const [stats, setStats] = useState({
    withinSlaPct: 100,
    pendingCount: 0,
    activeRules: 0,
    smeCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [tag, setTag] = useState("");
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const [destType, setDestType] = useState<"slack" | "email">("slack");
  const [showAddForm, setShowAddForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [rulesRes, qaRes] = await Promise.all([
      fetch("/api/corpus/routing-rules"),
      fetch("/api/corpus/qa-inquiries"),
    ]);

    if (rulesRes.ok) {
      const body = (await rulesRes.json()) as { rules: Rule[] };
      setRules(body.rules ?? []);
    }
    if (qaRes.ok) {
      const body = (await qaRes.json()) as {
        inquiries: QaInquiry[];
        stats: typeof stats;
      };
      setInquiries(body.inquiries ?? []);
      setStats(body.stats);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addRule(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/corpus/routing-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tag,
        destinationType: destType,
        destinationAddress: address,
        label: label || undefined,
      }),
    });
    if (!response.ok) {
      toast.error("Could not save routing rule.");
      return;
    }
    toast.success("Routing rule added.");
    setTag("");
    setAddress("");
    setLabel("");
    setShowAddForm(false);
    void load();
  }

  async function removeRule(ruleId: string) {
    if (!confirm("Delete this routing rule?")) return;
    const response = await fetch(`/api/corpus/routing-rules/${ruleId}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("Could not delete rule.");
      return;
    }
    toast.success("Rule deleted.");
    void load();
  }

  return (
    <div className="handoff-page-enter space-y-5">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h1 className="font-display text-xl font-extrabold text-[#0a1628]">Q&A Routing</h1>
          <p className="mt-1 text-xs text-[#64748b]">
            Tag-based rules that route SE questions to Slack channels or SME email with 48-hour SLA tracking
          </p>
        </div>
        <Button onClick={() => setShowAddForm((open) => !open)} size="sm" type="button">
          <Plus className="mr-2 h-4 w-4" />
          Add rule
        </Button>
      </header>

      <HandoffMetricStrip
        metrics={[
          {
            label: "Within SLA",
            value: `${stats.withinSlaPct}%`,
            sub: "48h SLA · pending queue",
            accent: "#10b981",
            valueClassName: "text-[#10b981]",
          },
          {
            label: "Pending response",
            value: String(stats.pendingCount),
            sub: "Open inquiries",
            accent: "#f59e0b",
            valueClassName: stats.pendingCount > 0 ? "text-[#f59e0b]" : undefined,
          },
          {
            label: "Active rules",
            value: String(stats.activeRules),
            sub: "Tag → destination mappings",
            accent: "#0071ce",
          },
          {
            label: "SMEs assigned",
            value: String(stats.smeCount),
            sub: "Unique destinations",
            accent: "#cc27b0",
          },
        ]}
      />

      {showAddForm ? (
        <HandoffCard className="p-4">
          <form className="grid gap-2 md:grid-cols-2" onSubmit={addRule}>
            <Input onChange={(e) => setTag(e.target.value)} placeholder="Tag (e.g. Agentic AI)" required value={tag} />
            <select
              className="h-10 rounded-lg border border-[#e2eaf5] px-3 text-sm"
              onChange={(e) => setDestType(e.target.value as "slack" | "email")}
              value={destType}
            >
              <option value="slack">Slack channel</option>
              <option value="email">Email</option>
            </select>
            <Input
              onChange={(e) => setAddress(e.target.value)}
              placeholder={destType === "slack" ? "#channel or ID" : "sme@company.com"}
              required
              value={address}
            />
            <Input onChange={(e) => setLabel(e.target.value)} placeholder="SME label (optional)" value={label} />
            <Button className="md:col-span-2" type="submit">
              Save rule
            </Button>
          </form>
        </HandoffCard>
      ) : null}

      <HandoffCard className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#f1f5f9] px-[18px] py-3">
          <p className="text-[12.5px] font-bold text-[#0a1628]">Routing rules</p>
          <p className="text-[10.5px] text-[#64748b]">Tag match → destination channel/person</p>
        </div>
        <div
          className="grid border-b border-[#f1f5f9] bg-[#f8fafd] px-[18px] py-[9px]"
          style={{ gridTemplateColumns: ROUTING_COLS }}
        >
          {["Tag match", "Channel", "SME", "SLA", "Hits", ""].map((header) => (
            <span className="text-[9.5px] font-bold uppercase tracking-[0.07em] text-[#94a3b8]" key={header}>
              {header}
            </span>
          ))}
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[#94a3b8]" />
          </div>
        ) : rules.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[#94a3b8]">No routing rules yet.</p>
        ) : (
          rules.map((rule) => (
            <div
              className="grid items-center border-b border-[#f9fafb] px-[18px] py-[10px] transition hover:bg-[#f7fafd] last:border-b-0"
              key={rule.id}
              style={{ gridTemplateColumns: ROUTING_COLS }}
            >
              <div className="flex flex-wrap gap-[5px]">
                <span className="rounded-full bg-[#e8f2fc] px-[8px] py-[2px] text-[10px] font-bold text-[#0057a8]">
                  {rule.tag}
                </span>
                <span className="rounded-full bg-[#dbeafe] px-[8px] py-[2px] text-[10px] font-bold text-[#1d4ed8]">
                  {rule.label ?? rule.destination_type}
                </span>
              </div>
              <span className="truncate text-[12px] font-semibold text-[#1e293b]">
                {rule.destination_type}:{rule.destination_address}
              </span>
              <span className="truncate text-[12px] text-[#475569]">{rule.label ?? "—"}</span>
              <span className="w-fit rounded-full bg-[#dcfce7] px-[8px] py-[2px] text-[9.5px] font-bold text-[#15803d]">
                48h
              </span>
              <span className="font-display text-[14px] font-extrabold text-[#0a1628]">0</span>
              <div className="flex gap-[6px]">
                <button
                  className="inline-flex items-center rounded-md border border-[#e2eaf5] bg-white px-[10px] py-[5px] text-[11px] font-semibold text-[#334155]"
                  type="button"
                >
                  Edit
                </button>
                <button
                  className="inline-flex items-center rounded-md px-[10px] py-[5px] text-[11px] font-semibold"
                  onClick={() => void removeRule(rule.id)}
                  style={{ background: "#fee2e2", border: "1.5px solid #fecaca", color: "#dc2626" }}
                  type="button"
                >
                  Disable
                </button>
              </div>
            </div>
          ))
        )}
      </HandoffCard>

      <HandoffCard className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#f1f5f9] px-[18px] py-3">
          <div>
            <p className="text-[12.5px] font-bold text-[#0a1628]">Active escalations</p>
            <p className="text-[10.5px] text-[#94a3b8]">Questions routed from ISC Lab awaiting SME response</p>
          </div>
          <span className="rounded-full bg-[#fdf0fa] px-2.5 py-1 text-[9.5px] font-bold text-[#a51e8e]">
            {inquiries.length} pending · 48h SLA
          </span>
        </div>
        {inquiries.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[#94a3b8]">No active escalations.</p>
        ) : (
          inquiries.map((row) => (
            <div
              className="flex items-start gap-[12px] border-b border-[#f9fafb] px-[18px] py-[11px] transition hover:bg-[#f7fafd] last:border-b-0"
              key={row.id}
            >
              <div className="min-w-0 flex-1">
                <p className="mb-[3px] text-[12px] font-semibold text-[#1e293b]">{row.question}</p>
                <p className="text-[10.5px] text-[#94a3b8]">
                  {row.profiles?.full_name ?? "SE"} · Routed to {row.routed_destination_address ?? "unrouted"} ·{" "}
                  {row.routed_destination_type ?? "—"}
                </p>
              </div>
              <div className="mr-[8px] flex-shrink-0 text-right">
                <p className="text-[11px] font-bold" style={{ color: elapsedColor(row.elapsedHours) }}>
                  {row.elapsedHours}h elapsed
                </p>
                <p className="mt-[2px] text-[9.5px] text-[#94a3b8]">{row.sla.label}</p>
              </div>
              <div className="flex flex-shrink-0 gap-[6px]">
                <button
                  className="inline-flex items-center rounded-md bg-[#0071ce] px-[10px] py-[5px] text-[11px] font-semibold text-white"
                  type="button"
                >
                  Mark answered
                </button>
                <button
                  className="inline-flex items-center rounded-md border border-[#e2eaf5] bg-white px-[10px] py-[5px] text-[11px] font-semibold text-[#334155]"
                  type="button"
                >
                  Re-route
                </button>
              </div>
            </div>
          ))
        )}
      </HandoffCard>
    </div>
  );
}
