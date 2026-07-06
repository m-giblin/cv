import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function canAccessSubmission(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  userId: string,
  submissionUserId: string,
) {
  if (userId === submissionUserId) {
    return true;
  }

  const { data: reviewer } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (!reviewer?.role || !["manager", "mentor", "director", "admin"].includes(reviewer.role)) {
    return false;
  }

  const { data: seProfile } = await supabase
    .from("profiles")
    .select("manager_id")
    .eq("id", submissionUserId)
    .maybeSingle();

  if (seProfile?.manager_id === userId) {
    return true;
  }

  const { data: teammate } = await supabase
    .from("profiles")
    .select("manager_id")
    .eq("id", userId)
    .maybeSingle();

  return Boolean(teammate?.manager_id && teammate.manager_id === seProfile?.manager_id);
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
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

  const { id } = await context.params;

  const { data: submission } = await supabase
    .from("pitch_submissions")
    .select("id, user_id, evidence_path, title, status, manager_grade, reflection_text")
    .eq("id", id)
    .maybeSingle();

  if (!submission) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allowed = await canAccessSubmission(supabase, user.id, submission.user_id);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase.storage
    .from("evidence")
    .createSignedUrl(submission.evidence_path, 3600);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    signedUrl: data.signedUrl,
    title: submission.title,
    status: submission.status,
    managerGrade: submission.manager_grade,
    reflectionText: submission.reflection_text,
  });
}
