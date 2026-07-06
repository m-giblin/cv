import { generateText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceAiRateLimit } from "@/lib/ai/enforce-rate-limit";
import { logAiUsage } from "@/lib/ai/log-usage";
import { resolveAiProvider } from "@/lib/ai/provider";
import { createNotification } from "@/lib/notifications/create-notification";
import { buildIscLabSystemPrompt, retrieveIscLabContext } from "@/lib/isc-lab/retrieve-context";
import { logIscLabInteraction } from "@/lib/isc-lab/session-log";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";

const schema = z.object({
  accountName: z.string().min(2),
  meetingDate: z.string().optional(),
  sessionId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const session = await requireAuthenticatedSession();
  if (session instanceof NextResponse) return session;

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const rateLimited = await enforceAiRateLimit(session.supabase, session.user.id);
  if (rateLimited) return rateLimited;

  const { accountName, meetingDate, sessionId } = parsed.data;
  const query = `Pre-call brief for ${accountName}${meetingDate ? ` meeting on ${meetingDate}` : ""}`;

  const retrieval = await retrieveIscLabContext({
    query,
    supabase: session.supabase,
    userId: session.user.id,
    mode: "pre_call_brief",
    accountName,
  });

  const { provider, model, modelName } = await resolveAiProvider();
  if (!model) {
    return NextResponse.json({ error: "AI provider not configured" }, { status: 503 });
  }

  const result = await generateText({
    model,
    system: buildIscLabSystemPrompt(retrieval.contextBlock),
    prompt: `Produce a markdown pre-call brief with sections: Executive summary, Discovery questions (5), Objection prep (3), Demo recommendation, Next steps. Account: ${accountName}.`,
  });

  const briefMarkdown = result.text.trim();

  const { data: briefRow, error } = await session.supabase
    .from("isc_lab_precall_briefs")
    .insert({
      user_id: session.user.id,
      deal_prep_session_id: sessionId ?? retrieval.accountContext?.latestPrepSessionId ?? null,
      account_name: accountName,
      meeting_date: meetingDate ?? retrieval.accountContext?.meetingDate ?? null,
      brief_markdown: briefMarkdown,
      sources: retrieval.sources.map((s) => ({
        url: s.url,
        title: s.title,
        fetchedAt: s.fetchedAt,
        contentVersion: s.contentVersion,
      })),
      delivered_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAiUsage(session.supabase, {
    feature: "isc_lab",
    provider,
    model: modelName,
    userId: session.user.id,
    usage: result.usage,
  });

  await logIscLabInteraction(session.supabase, {
    userId: session.user.id,
    mode: "pre_call_brief",
    query,
    accountName,
    reply: briefMarkdown,
    sources: retrieval.sources,
    model: modelName,
    provider,
    savedToPrepSessionId: sessionId ?? retrieval.accountContext?.latestPrepSessionId ?? null,
  });

  await createNotification(session.supabase, {
    userId: session.user.id,
    title: `Pre-call brief ready — ${accountName}`,
    body: "ISC Lab generated your meeting brief with cited sources.",
    actionUrl: "/lab",
  });

  return NextResponse.json({
    id: briefRow.id,
    briefMarkdown,
    sources: retrieval.sources,
    model: modelName,
    provider,
  });
}

/** Generate briefs for tomorrow's meetings (call on dashboard load or cron). */
export async function GET(request: Request) {
  const session = await requireAuthenticatedSession();
  if (session instanceof NextResponse) return session;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const { data: sessions } = await session.supabase
    .from("deal_prep_sessions")
    .select("id, account_name, meeting_date")
    .eq("user_id", session.user.id)
    .eq("meeting_date", tomorrowStr);

  const { data: existing } = await session.supabase
    .from("isc_lab_precall_briefs")
    .select("account_name")
    .eq("user_id", session.user.id)
    .eq("meeting_date", tomorrowStr);

  const alreadyBriefed = new Set((existing ?? []).map((row) => row.account_name.toLowerCase()));
  const pending = (sessions ?? []).filter((row) => !alreadyBriefed.has(row.account_name.toLowerCase()));

  return NextResponse.json({
    tomorrow: tomorrowStr,
    pendingAccounts: pending.map((row) => ({
      accountName: row.account_name,
      sessionId: row.id,
      meetingDate: row.meeting_date,
    })),
  });
}
