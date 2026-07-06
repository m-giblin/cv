import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { CorpusRoutingRule } from "@/lib/corpus/types";
import { dispatchCorpusEmail } from "@/lib/corpus/email-dispatch";

export async function loadRoutingRulesForTags(
  supabase: SupabaseClient<Database>,
  tags: string[],
): Promise<CorpusRoutingRule[]> {
  if (tags.length === 0) return [];

  const normalized = tags.map((tag) => tag.toLowerCase());
  const { data } = await supabase.from("corpus_routing_rules").select("*").in("tag", tags);

  return (data ?? [])
    .filter((row) => normalized.includes(row.tag.toLowerCase()))
    .map((row) => ({
      id: row.id,
      tag: row.tag,
      destinationType: row.destination_type as CorpusRoutingRule["destinationType"],
      destinationAddress: row.destination_address,
      label: row.label,
    }));
}

export async function dispatchQaRouting(input: {
  question: string;
  rules: CorpusRoutingRule[];
  assetTitle?: string;
  draftAnswer?: string;
  sources?: Array<{ title: string; url: string }>;
  confidence?: number;
}): Promise<{ sent: boolean; destinations: string[]; error?: string }> {
  const destinations: string[] = [];

  const sourceLines =
    input.sources?.map((s) => `• ${s.title}: ${s.url}`).join("\n") ?? "No sources attached.";

  for (const rule of input.rules) {
    destinations.push(`${rule.destinationType}:${rule.destinationAddress}`);

    const body = [
      `*ISC Enablement Q&A*`,
      input.assetTitle ? `Asset: ${input.assetTitle}` : null,
      `Tag: ${rule.tag}`,
      typeof input.confidence === "number" ? `Confidence: ${(input.confidence * 100).toFixed(0)}%` : null,
      `Question: ${input.question}`,
      input.draftAnswer ? `\n*Draft answer:*\n${input.draftAnswer}` : null,
      `\n*Sources:*\n${sourceLines}`,
    ]
      .filter(Boolean)
      .join("\n");

    if (rule.destinationType === "slack" && process.env.SLACK_BOT_TOKEN) {
      const response = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ channel: rule.destinationAddress, text: body }),
      });

      const slackBody = (await response.json()) as { ok?: boolean; error?: string };
      if (!slackBody.ok) {
        return { sent: false, destinations, error: slackBody.error ?? "Slack dispatch failed" };
      }
    }

    if (rule.destinationType === "email") {
      const emailResult = await dispatchCorpusEmail({
        to: rule.destinationAddress,
        subject: `ISC Enablement Q&A — ${rule.tag}`,
        body: body.replace(/\*/g, ""),
      });
      if (!emailResult.sent) {
        return { sent: false, destinations, error: emailResult.error };
      }
    }
  }

  return { sent: destinations.length > 0, destinations };
}

export async function escalateStaleCorpusInquiries(supabase: SupabaseClient<Database>) {
  const cutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString();

  const { data: stale } = await supabase
    .from("corpus_qa_inquiries")
    .select("id, question, user_id")
    .eq("status", "routed")
    .is("escalated_at", null)
    .lt("created_at", cutoff)
    .limit(50);

  if (!stale?.length) return { escalated: 0 };

  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .in("role", ["admin", "director"]);

  for (const inquiry of stale) {
    await supabase
      .from("corpus_qa_inquiries")
      .update({ escalated_at: new Date().toISOString() })
      .eq("id", inquiry.id);

    for (const admin of admins ?? []) {
      const { createNotification } = await import("@/lib/notifications/create-notification");
      await createNotification(supabase, {
        userId: admin.id,
        title: "SME Q&A SLA breach",
        body: inquiry.question.slice(0, 120),
        actionUrl: "/admin?tab=corpus",
      });
    }
  }

  return { escalated: stale.length };
}
