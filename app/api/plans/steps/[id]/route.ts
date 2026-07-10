import { NextResponse } from "next/server";
import { z } from "zod";
import { submitAssignmentStep } from "@/lib/plans/complete-step";
import { StepSegmentLockedError } from "@/lib/plans/segment-lock";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
 notes: z.string().optional(),
});

export async function PATCH(
 request: Request,
 context: { params: Promise<{ id: string }> },
) {
 const { id } = await context.params;
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

 const parsed = schema.safeParse(await request.json().catch(() => ({})));

 if (!parsed.success) {
 return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
 }

 try {
 const result = await submitAssignmentStep(supabase, {
 assignmentStepId: id,
 userId: user.id,
 notes: parsed.data.notes,
 });

 return NextResponse.json({ success: true, ...result });
 } catch (error) {
 if (error instanceof StepSegmentLockedError) {
 return NextResponse.json({ error: error.message }, { status: 403 });
 }
 return NextResponse.json(
 { error: error instanceof Error ? error.message : "Could not submit step" },
 { status: 400 },
 );
 }
}
