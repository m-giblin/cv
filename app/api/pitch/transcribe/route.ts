import { experimental_transcribe as transcribe } from "ai";
import { NextResponse } from "next/server";
import { enforceAiRateLimit } from "@/lib/ai/enforce-rate-limit";
import { logAiUsage } from "@/lib/ai/log-usage";
import { resolveAiProviderForUser } from "@/lib/ai/resolve-provider-for-user";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";

/** Pitches are capped at two minutes; this leaves room for video at typical browser bitrates. */
const MAX_BYTES = 25 * 1024 * 1024;

/** Speech-to-text for a recorded pitch (voice or video). Returns the words only; nothing is stored. */
export async function POST(request: Request) {
  const session = await requireAuthenticatedSession();
  if (session instanceof NextResponse) return session;

  const form = await request.formData().catch(() => null);
  const file = form?.get("audio");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "Record your pitch first." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "That recording is too long to transcribe. Keep pitches under two minutes." }, { status: 400 });
  }
  if (!/^(audio|video)\//.test(file.type || "audio/webm")) {
    return NextResponse.json({ error: "Only audio or video recordings can be transcribed." }, { status: 400 });
  }

  const rateLimited = await enforceAiRateLimit(session.supabase, session.user.id);
  if (rateLimited) return rateLimited;

  const { provider, modelName, transcription } = await resolveAiProviderForUser(session.supabase, session.user.id);
  if (!transcription) {
    return NextResponse.json({ error: "AI isn't configured, so recordings can't be transcribed. Type your pitch instead." }, { status: 503 });
  }

  try {
    const result = await transcribe({ model: transcription, audio: new Uint8Array(await file.arrayBuffer()) });
    await logAiUsage(session.supabase, {
      feature: "pitch_transcribe",
      provider,
      model: `${modelName} (speech-to-text)`,
      userId: session.user.id,
    });
    const text = result.text.trim();
    if (!text) return NextResponse.json({ error: "We couldn't hear any speech. Check your microphone and try again." }, { status: 422 });
    return NextResponse.json({ transcript: text, durationSec: result.durationInSeconds ?? null });
  } catch {
    return NextResponse.json({ error: "Transcription didn't work just now. Try again, or type your pitch." }, { status: 502 });
  }
}
