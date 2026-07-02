import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { challengePrompt } from "@/lib/ai/prompts";
import { generatedChallengeSchema } from "@/lib/ai/schemas";
import { getConfiguredProvider } from "@/lib/ai/provider";

const requestSchema = z.object({
  level: z.enum(["Basic", "Senior", "Advisory"]).default("Basic"),
  topic: z.string().min(2).default("Identity Security Cloud workflows"),
  difficulty: z.enum(["foundational", "intermediate", "advanced"]).default("foundational"),
  recentActivity: z.string().default(""),
});

export async function POST(request: Request) {
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
        title: `${parsed.data.topic} customer practice challenge`,
        description:
          "Prepare a concise customer-ready walkthrough that connects SailPoint capabilities to measurable identity security outcomes, then submit evidence and a reflection for manager review.",
        steps: [
          "Write the customer scenario, current pain, and desired identity security outcome.",
          "Build or outline the SailPoint demo path using ISC workflows, forms, transforms, or connector behavior where relevant.",
          "Record a five-minute talk track or upload notes that explain tradeoffs, risks, and next steps.",
        ],
        successCriteria: [
          "Uses accurate SailPoint terminology and avoids unsupported product claims.",
          "Connects the technical action to a business outcome the persona would care about.",
          "Includes one thoughtful limitation, risk, or follow-up discovery question.",
        ],
        estimatedMinutes: parsed.data.difficulty === "advanced" ? 90 : 45,
        linkedResources: ["SailPoint Identity Library", "Internal SE demo tenant notes"],
        linkedSolutions: ["Identity Security Cloud", "Workflows", "Access certifications"],
        difficulty: parsed.data.difficulty,
      },
    });
  }

  const result = await generateObject({
    model,
    schema: generatedChallengeSchema,
    prompt: challengePrompt(parsed.data),
    experimental_telemetry: {
      isEnabled: true,
      functionId: "generate-challenge",
      metadata: {
        provider,
        modelName,
      },
    },
  });

  return NextResponse.json({
    provider,
    modelName,
    object: result.object,
    usage: result.usage,
  });
}
