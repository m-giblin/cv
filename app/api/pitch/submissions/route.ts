import { NextResponse } from "next/server";
import { z } from "zod";
import { createNotification } from "@/lib/notifications/create-notification";
import { createClient } from "@/lib/supabase/server";

const postSchema = z.object({
  title: z.string().min(3),
  evidencePath: z.string().min(3),
  reflectionText: z.string().optional(),
  targetType: z.enum(["challenge", "certification", "practice"]).default("practice"),
  targetId: z.string().optional(),
});

export async function GET(request: Request) {
  const supabase = await createClient();

  if (!supabase) {
    return NextResponse.json({ submissions: [] });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  const status = url.searchParams.get("status");

  let query = supabase.from("pitch_submissions").select("*").order("created_at", { ascending: false });

  if (userId) {
    query = query.eq("user_id", userId);
  } else {
    query = query.eq("user_id", user.id);
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ submissions: data ?? [] });
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

  const parsed = postSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!parsed.data.evidencePath.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Invalid evidence path." }, { status: 403 });
  }

  const { data: fileList } = await supabase.storage.from("evidence").list(user.id, { search: parsed.data.evidencePath.split("/").pop() });
  void fileList;

  const { data, error } = await supabase
    .from("pitch_submissions")
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      evidence_path: parsed.data.evidencePath,
      reflection_text: parsed.data.reflectionText ?? null,
      target_type: parsed.data.targetType,
      target_id: parsed.data.targetId ?? null,
      status: "submitted",
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: profile } = await supabase.from("profiles").select("manager_id").eq("id", user.id).maybeSingle();

  if (profile?.manager_id) {
    await createNotification(supabase, {
      userId: profile.manager_id,
      title: "Video pitch submitted",
      body: `Review ${parsed.data.title} from your SE.`,
      actionUrl: "/manager",
    });
  }

  return NextResponse.json({ submission: data });
}
