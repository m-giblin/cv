import { generateText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveAiProvider } from "@/lib/ai/provider";
import { enforceAiRateLimit } from "@/lib/ai/enforce-rate-limit";
import { logAiUsage } from "@/lib/ai/log-usage";
import { SIMULATION_START_MESSAGE, roleplayEnded } from "@/lib/simulations/prompt-template";
import { createClient } from "@/lib/supabase/server";

const transcriptEntrySchema = z.object({
 speaker: z.enum(["se", "persona", "coach"]),
 message: z.string().max(8000),
});

const requestSchema = z.object({
 assignmentId: z.string().uuid().optional(),
 promptSnapshot: z.string().min(50).max(12000),
 transcript: z.array(transcriptEntrySchema).max(80),
 message: z.string().max(4000).optional(),
 isStart: z.boolean().optional(),
 startMessage: z.string().optional(),
});

function buildMessages(transcript: z.infer<typeof transcriptEntrySchema>[], userMessage: string) {
 const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

 for (const entry of transcript) {
 if (entry.speaker === "se") {
 messages.push({ role: "user", content: entry.message });
 } else {
 messages.push({ role: "assistant", content: entry.message });
 }
 }

 messages.push({ role: "user", content: userMessage });
 return messages;
}

function classifySpeaker(response: string, seMessage: string): "persona" | "coach" {
 if (seMessage.trim().toUpperCase().startsWith("HINT:")) {
 return "coach";
 }

 if (
 response.includes("PART 2 — COACHING NOTE") ||
 response.includes("STEP 4 — AUTOMATIC DEBRIEF") ||
 response.includes("Discovery Quality") ||
 response.includes("TOTAL:")
 ) {
 return "coach";
 }

 return "persona";
}

export async function POST(request: Request) {
 const supabase = await createClient();

 if (!supabase) {
 return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
 }

 const {
 data: { user },
 } = await supabase.auth.getUser();

 if (!user) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

 const parsed = requestSchema.safeParse(await request.json());

 if (!parsed.success) {
 return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 }

 const rateLimited = await enforceAiRateLimit(supabase, user.id);
 if (rateLimited) {
 return rateLimited;
 }

 let promptSnapshot = parsed.data.promptSnapshot;

 const { model, provider, modelName } = await resolveAiProvider();

 if (parsed.data.assignmentId) {
 const { data: assignment, error: assignmentError } = await supabase
 .from("simulation_assignments")
 .select("assigned_to, session_data")
 .eq("id", parsed.data.assignmentId)
 .maybeSingle();

 if (assignmentError || !assignment) {
 return NextResponse.json({ error: "Simulation assignment not found" }, { status: 404 });
 }

 if (assignment.assigned_to !== user.id) {
 return NextResponse.json({ error: "Forbidden" }, { status: 403 });
 }

 const storedSnapshot =
 typeof assignment.session_data === "object" &&
 assignment.session_data !== null &&
 "promptSnapshot" in assignment.session_data &&
 typeof (assignment.session_data as { promptSnapshot?: unknown }).promptSnapshot === "string"
 ? (assignment.session_data as { promptSnapshot: string }).promptSnapshot
 : null;

 if (storedSnapshot) {
 promptSnapshot = storedSnapshot;
 }
 }

 const userMessage = parsed.data.isStart
 ? (parsed.data.startMessage ?? SIMULATION_START_MESSAGE)
 : parsed.data.message?.trim();

 if (!userMessage) {
 return NextResponse.json({ error: "Message is required" }, { status: 400 });
 }

 if (!model) {
 const demoResponse = parsed.data.isStart
 ? `**PERSONA CARD**
Name: Jordan Ellis | Title: CISO | Org: State agency (SLG) | Top Priority: Audit readiness before fiscal year close | Attitude: Cautiously optimistic | Secret Fear: Another failed IAM rollout | Opening Move: "We keep getting asked for access certification evidence we cannot produce quickly."

--- ROLEPLAY BEGINS ---
Jordan Ellis: Before we go deep — why should we talk about ${parsed.data.promptSnapshot.includes("AIS") ? "agent identity" : "identity governance"} now instead of finishing our Entra rollout?`
 : `Jordan Ellis: That is a fair point, but my board wants numbers. What would we measure in the first 90 days if we piloted this?`;

 return NextResponse.json({
 provider,
 modelName,
 response: demoResponse,
 speaker: "persona" as const,
 roleplayEnded: false,
 });
 }

 try {
 const result = await generateText({
 model,
 system: promptSnapshot,
 messages: buildMessages(parsed.data.transcript, userMessage),
 experimental_telemetry: {
 isEnabled: true,
 functionId: parsed.data.isStart ? "simulation-start" : "simulation-turn",
 },
 });

 const speaker = classifySpeaker(result.text, userMessage);

 await logAiUsage(supabase, {
 feature: "simulation_turn",
 provider,
 model: modelName,
 userId: user.id,
 usage: result.usage,
 });

 return NextResponse.json({
 provider,
 modelName,
 response: result.text,
 speaker,
 roleplayEnded: roleplayEnded(result.text),
 usage: result.usage,
 });
 } catch (error) {
 console.error("simulation-turn failed", error);
 return NextResponse.json(
 {
 error:
 error instanceof Error && error.message
 ? error.message
 : "AI provider could not complete this simulation turn.",
 },
 { status: 502 },
 );
 }
}
