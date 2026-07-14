import { NextResponse } from "next/server";
import { canReviewUserWork } from "@/lib/auth/can-review";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { resolveEvidenceEntry } from "@/lib/evidence/resolve-evidence-file";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;
  const url = new URL(request.url);
  const index = Number.parseInt(url.searchParams.get("index") ?? "0", 10);

  const { data: submission } = await session.supabase
    .from("challenge_submissions")
    .select("user_id, evidence_files")
    .eq("id", id)
    .maybeSingle();

  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  if (!(await canReviewUserWork(submission.user_id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const entry = submission.evidence_files?.[index];
  if (!entry) {
    return NextResponse.json({ error: "Evidence not found" }, { status: 404 });
  }

  const resolved = await resolveEvidenceEntry(session.supabase, entry, submission.user_id);
  if (!resolved.href) {
    return NextResponse.json({ error: "Evidence file is unavailable." }, { status: 404 });
  }

  return NextResponse.redirect(resolved.href);
}
