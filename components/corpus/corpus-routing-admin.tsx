"use client";

import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AdminTable,
  EmptyState,
  Field,
  KpiStrip,
  LineCard,
  LineRow,
  LinkButton,
  LoadingState,
  Mono,
  SecondaryButton,
  SectionHeading,
  SelectInput,
  Td,
  TextInput,
  Th,
} from "@/components/admin/admin-ui";
import { Tag } from "@/components/ui/tag";
import { cn } from "@/lib/utils";

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

function elapsedClass(hours: number) {
  if (hours > 36) return "text-danger";
  if (hours >= 24) return "text-warning";
  return "text-ink-2";
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
    <div className="flex flex-col gap-6">
      <SectionHeading
        actions={
          <SecondaryButton aria-expanded={showAddForm} onClick={() => setShowAddForm((open) => !open)}>
            <Plus aria-hidden className="h-4 w-4" />
            {showAddForm ? "Close" : "Add rule"}
          </SecondaryButton>
        }
        meta="Tag rules · 48h SLA"
        title="Q&A routing"
      />

      <KpiStrip
        items={[
          { label: "Within SLA", value: loading ? "—" : stats.withinSlaPct, suffix: loading ? undefined : "%" },
          { label: "Pending", value: loading ? "—" : stats.pendingCount },
          { label: "Active rules", value: loading ? "—" : stats.activeRules },
          { label: "SMEs assigned", value: loading ? "—" : stats.smeCount },
        ]}
      />

      {showAddForm ? (
        <LineCard title="New routing rule">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={addRule}>
            <Field htmlFor="routing-rule-tag" label="Tag match">
              <TextInput
                id="routing-rule-tag"
                onChange={(e) => setTag(e.target.value)}
                placeholder="e.g. Agentic AI"
                required
                value={tag}
              />
            </Field>
            <Field htmlFor="routing-rule-type" label="Destination type">
              <SelectInput
                id="routing-rule-type"
                onChange={(e) => setDestType(e.target.value as "slack" | "email")}
                value={destType}
              >
                <option value="slack">Slack channel</option>
                <option value="email">Email</option>
              </SelectInput>
            </Field>
            <Field htmlFor="routing-rule-address" label={destType === "slack" ? "Channel" : "Email address"}>
              <TextInput
                id="routing-rule-address"
                onChange={(e) => setAddress(e.target.value)}
                placeholder={destType === "slack" ? "#channel or ID" : "sme@company.com"}
                required
                type={destType === "email" ? "email" : "text"}
                value={address}
              />
            </Field>
            <Field htmlFor="routing-rule-label" label="SME label (optional)">
              <TextInput id="routing-rule-label" onChange={(e) => setLabel(e.target.value)} value={label} />
            </Field>
            <div className="flex items-center gap-4 md:col-span-2">
              <SecondaryButton type="submit">Save rule</SecondaryButton>
              <LinkButton onClick={() => setShowAddForm(false)}>Cancel</LinkButton>
            </div>
          </form>
        </LineCard>
      ) : null}

      <div className="flex flex-col gap-3">
        <SectionHeading as="h3" meta="Tag match → destination" title="Routing rules" />
        {loading ? (
          <div className="rounded-[14px] border border-line bg-white">
            <LoadingState label="Loading rules…" />
          </div>
        ) : rules.length === 0 ? (
          <div className="rounded-[14px] border border-line bg-white">
            <EmptyState>No routing rules yet.</EmptyState>
          </div>
        ) : (
          <AdminTable caption="Q&A routing rules">
            <thead>
              <tr>
                <Th>Tag match</Th>
                <Th>Destination</Th>
                <Th>SME</Th>
                <Th>SLA</Th>
                <Th>
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr className="hover:bg-blue-soft" key={rule.id}>
                  <Td>
                    <Tag tone="blue">{rule.tag}</Tag>
                  </Td>
                  <Td className="max-w-[280px]">
                    <span className="flex min-w-0 items-center gap-2">
                      <Mono className="shrink-0 text-muted">{rule.destination_type}</Mono>
                      <span className="truncate font-bold">{rule.destination_address}</span>
                    </span>
                  </Td>
                  <Td className="text-ink-2">{rule.label ?? "—"}</Td>
                  <Td>
                    <Mono>48h</Mono>
                  </Td>
                  <Td className="text-right">
                    <LinkButton
                      aria-label={`Delete routing rule for ${rule.tag}`}
                      onClick={() => void removeRule(rule.id)}
                      tone="danger"
                    >
                      Delete
                    </LinkButton>
                  </Td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        )}
      </div>

      <LineCard
        actions={
          <Tag tone={inquiries.length > 0 ? "signal" : "neutral"}>{inquiries.length} pending · 48h SLA</Tag>
        }
        bodyClassName="p-0"
        meta="Lab questions awaiting an SME"
        title="Active escalations"
      >
        {inquiries.length === 0 ? (
          <EmptyState>{loading ? "Loading escalations…" : "No active escalations."}</EmptyState>
        ) : (
          inquiries.map((row) => (
            <LineRow className="flex flex-wrap items-start justify-between gap-3" key={row.id}>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-ink">{row.question}</p>
                <p className="mt-0.5 text-[13px] text-muted">
                  {row.profiles?.full_name ?? "SE"} · Routed to {row.routed_destination_address ?? "unrouted"} ·{" "}
                  {row.routed_destination_type ?? "—"}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className={cn("font-mono text-xs uppercase", elapsedClass(row.elapsedHours))}>
                  {row.elapsedHours}h elapsed
                </p>
                <p className="mt-0.5 text-[13px] text-muted">{row.sla.label}</p>
              </div>
            </LineRow>
          ))
        )}
      </LineCard>
    </div>
  );
}
