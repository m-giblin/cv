import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const coachSchema = z.object({
 title: z.string().min(3),
 reflection: z.string().min(10),
 scenario: z.string().min(2),
});

export async function POST(request: Request) {
 const supabase = await createClient();
 if (!supabase) {
 return NextResponse.json({ configured: false, tips: [] });
 }

 const {
 data: { user },
 } = await supabase.auth.getUser();
 if (!user) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

 const parsed = coachSchema.safeParse(await request.json());
 if (!parsed.success) {
 return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 }

 const tips: string[] = [];
 const reflection = parsed.data.reflection.toLowerCase();

 if (!/outcome|business|risk|audit|governance/i.test(reflection)) {
 tips.push("Lead with a business outcome in the first 15 seconds — not product modules.");
 }
 if (!/sailpoint|isc|identity|agentic|ais/i.test(reflection)) {
 tips.push("Name SailPoint differentiation explicitly (ISC governance vs directory-only).");
 }
 if (parsed.data.scenario.includes("AIS") && !/agent|non-human|shadow/i.test(reflection)) {
 tips.push("AIS pitches should mention agent identity lifecycle — discover, govern, protect.");
 }
 if (parsed.data.scenario.includes("Competitive") && !/competitor|versus|differentiat/i.test(reflection)) {
 tips.push("Call out the competitor trap you're defusing — don't dodge it.");
 }
 if (reflection.length < 80) {
 tips.push("Expand your reflection — managers score storyline depth, not bullet fragments.");
 }
 if (tips.length === 0) {
 tips.push("Strong framing. Record with confidence — open with the customer's pain, close with a clear next step.");
 }

 return NextResponse.json({
 tips,
 rubric: {
 clarity: "Hook in 15s, no jargon wall",
 storyline: "Pain → SailPoint outcome → proof",
 differentiation: "Why ISC/AIS vs DIY or directory-only",
 callToAction: "Mutual next step agreed",
 },
 });
}
