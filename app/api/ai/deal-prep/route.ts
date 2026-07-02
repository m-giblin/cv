import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { dealPrepPrompt } from "@/lib/ai/prompts";
import { dealPrepSchema } from "@/lib/ai/schemas";
import { getConfiguredProvider } from "@/lib/ai/provider";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";

const requestSchema = z.object({
  accountName: z.string().min(2),
  industry: z.string().min(2),
  solutions: z.array(z.string()).min(1),
  accountContext: z.string().min(20),
  level: z.enum(["Basic", "Senior", "Advisory"]).default("Basic"),
});

export async function POST(request: Request) {
  const session = await requireAuthenticatedSession();
  if (session instanceof NextResponse) {
    return session;
  }

  const parsed = requestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { model, provider, modelName } = getConfiguredProvider();

  if (!model) {
    return NextResponse.json({
      provider,
      modelName,
      object: {
        accountName: parsed.data.accountName,
        industry: parsed.data.industry,
        solutions: parsed.data.solutions,
        accountContext: parsed.data.accountContext,
        likelyObjections: [
          "We already have Microsoft Entra governance — why add SailPoint?",
          "Implementation timeline seems long for our team size.",
        ],
        discoveryQuestions: [
          "Which identity decisions still require manual approval today?",
          "How do you certify access for contractors and machine identities?",
          "What audit findings are driving urgency this quarter?",
        ],
        talkTrackOutline: [
          "Open with their stated pain and business outcome, not product modules.",
          "Map ISC workflows to their top two identity risks.",
          "Close with a concrete next step: workshop, POC scope, or stakeholder map.",
        ],
        linkedResources: ["Identity Security Cloud overview", "Vertical reference architecture"],
        executiveSummary: `For ${parsed.data.accountName}, lead with measurable risk reduction and audit readiness in ${parsed.data.industry}. Tie ${parsed.data.solutions.join(" and ")} to outcomes the CISO and IAM lead care about.`,
      },
    });
  }

  const result = await generateObject({
    model,
    schema: dealPrepSchema,
    prompt: dealPrepPrompt(parsed.data),
    experimental_telemetry: { isEnabled: true, functionId: "deal-prep" },
  });

  return NextResponse.json({ provider, modelName, object: result.object, usage: result.usage });
}
