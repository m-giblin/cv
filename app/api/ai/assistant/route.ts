import { generateText } from "ai";
import { resolveTenantContext } from "@/lib/auth/tenant-context";
import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceAiRateLimit } from "@/lib/ai/enforce-rate-limit";
import { logAiUsage } from "@/lib/ai/log-usage";
import { resolveAiProviderForTenant } from "@/lib/ai/resolve-provider-for-user";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";
import {
  ASSISTANT_LIMITS,
  ASSISTANT_REFUSAL,
  assistantSystemPrompt,
  isClearlyOffTopic,
  pickContextArticles,
} from "@/lib/help/assistant";
import { docSourcesFrom, wantsDocsSearch } from "@/lib/help/sailpoint-docs";
import { helpArticlesFor, helpAudiencesForHats } from "@/lib/help";
import { loadShellData } from "@/lib/shell/load-shell-data";

const requestSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) }))
    .min(1)
    .max(40),
  portal: z.enum(["se", "manager", "tenant_admin", "platform"]).optional(),
});

const PORTAL_NAMES = { se: "SE", manager: "Manager", tenant_admin: "Admin", platform: "Platform" } as const;

/** Bosun, the in-app assistant: platform how-to and SailPoint topics only, grounded in the Help Center. */
export async function POST(request: Request) {
  const session = await requireAuthenticatedSession();
  if (session instanceof NextResponse) return session;

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const history = parsed.data.messages.slice(-ASSISTANT_LIMITS.historyMessages);
  const question = history.at(-1)!;
  if (question.role !== "user") return NextResponse.json({ error: "Ask a question first." }, { status: 400 });
  if (question.content.length > ASSISTANT_LIMITS.maxQuestionChars) {
    return NextResponse.json(
      { error: `Keep questions under ${ASSISTANT_LIMITS.maxQuestionChars} characters.` },
      { status: 400 },
    );
  }

  // Off-topic questions are answered without a model call, so they cost nothing.
  if (isClearlyOffTopic(question.content)) {
    return NextResponse.json({ answer: ASSISTANT_REFUSAL, sources: [], refused: true });
  }

  // Assistant-specific daily cap, on top of the shared per-user AI limit.
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const { count } = await session.supabase
    .from("ai_usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", session.user.id)
    .eq("feature", "assistant")
    .gte("created_at", startOfDay.toISOString());
  if ((count ?? 0) >= ASSISTANT_LIMITS.dailyQuestions) {
    return NextResponse.json(
      { error: `You've reached today's ${ASSISTANT_LIMITS.dailyQuestions} Bosun questions. The Help Center is always available.` },
      { status: 429 },
    );
  }
  const rateLimited = await enforceAiRateLimit(session.supabase, session.user.id);
  if (rateLimited) return rateLimited;

  // What this person may read comes from their own workspaces, never from the request.
  const shell = await loadShellData();
  const hats = shell?.workspaceHats ?? ["se"];
  const articles = helpArticlesFor(helpAudiencesForHats(hats));
  const portal = parsed.data.portal && hats.includes(parsed.data.portal) ? parsed.data.portal : hats[0] ?? "se";
  const context = pickContextArticles(articles, question.content);

  // The tenant being viewed (the shadowed one for operators) pays for and sees the usage.
  const tenantId = (await resolveTenantContext())?.tenantId ?? shell?.currentUser.tenantId ?? null;
  const { model, provider, modelName, docsSearch } = await resolveAiProviderForTenant(tenantId);
  if (!model) {
    return NextResponse.json({
      answer: context.length
        ? "Bosun isn't configured here yet, but these Help Center articles should help."
        : "Bosun isn't configured here yet. Try the Help Center.",
      sources: context.map((article) => ({ id: article.id, title: article.title })),
    });
  }

  // Live SailPoint docs only for product questions; the search itself is the costly part.
  const searchDocs = Boolean(docsSearch) && wantsDocsSearch(question.content);

  try {
    const result = await generateText({
      model: searchDocs ? docsSearch!.model : model,
      ...(searchDocs ? { tools: docsSearch!.tools } : {}),
      system: assistantSystemPrompt(context, PORTAL_NAMES[portal], searchDocs),
      messages: history.map((message) => ({ role: message.role, content: message.content })),
      maxOutputTokens: ASSISTANT_LIMITS.maxOutputTokens,
      temperature: 0.3,
    });
    await logAiUsage(session.supabase, {
      feature: "assistant",
      provider,
      model: modelName,
      userId: session.user.id,
      usage: result.usage,
      tenantId,
    });
    const answer = result.text.trim() || ASSISTANT_REFUSAL;
    const refused = answer.startsWith(ASSISTANT_REFUSAL.slice(0, 40));
    return NextResponse.json({
      answer,
      refused,
      sources: refused ? [] : context.map((article) => ({ id: article.id, title: article.title })),
      docs: refused ? [] : docSourcesFrom(result.sources as { sourceType?: string; url?: string; title?: string }[]),
      remaining: Math.max(0, ASSISTANT_LIMITS.dailyQuestions - (count ?? 0) - 1),
    });
  } catch {
    return NextResponse.json({ error: "The assistant couldn't answer just now. Try again in a moment." }, { status: 502 });
  }
}
