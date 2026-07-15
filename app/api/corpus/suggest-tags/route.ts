import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceAiRateLimit } from "@/lib/ai/enforce-rate-limit";
import { logAiUsage } from "@/lib/ai/log-usage";
import { resolveAiProviderForUser } from "@/lib/ai/resolve-provider-for-user";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { generateObject } from "ai";

const schema = z.object({
 title: z.string().min(2),
 url: z.string().url().optional(),
 description: z.string().optional(),
});

const tagSchema = z.object({
 assetType: z.enum(["video", "doc", "podcast", "link", "file"]),
 projectTags: z.array(z.string()).max(8),
 moduleTags: z.array(z.string()).max(8),
});

export async function POST(request: Request) {
 const session = await requireAdminSession();
 if (session instanceof NextResponse) return session;

 const parsed = schema.safeParse(await request.json());
 if (!parsed.success) {
 return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 }

 const rateLimited = await enforceAiRateLimit(session.supabase, session.user.id);
 if (rateLimited) return rateLimited;

 const { model, modelName } = await resolveAiProviderForUser(session.supabase, session.user.id);
 if (!model) {
 return NextResponse.json({
 assetType: "link" as const,
 projectTags: parsed.data.title.toLowerCase().includes("ais") ? ["AIS"] : ["ISC"],
 moduleTags: [],
 demo: true,
 });
 }

 const { object } = await generateObject({
 model,
 schema: tagSchema,
 prompt: `Suggest corpus tags for a SailPoint SE enablement asset.
Title: ${parsed.data.title}
URL: ${parsed.data.url ?? "n/a"}
Description: ${parsed.data.description ?? "n/a"}
Use project tags like ISC, AIS, Identity Security Cloud, Agentic. Module tags like Provisioning, Certification, Workflows.`,
 });

 await logAiUsage(session.supabase, {
 userId: session.user.id,
 feature: "corpus_suggest_tags",
 provider: "platform",
 model: modelName,
 });

 return NextResponse.json(object);
}
