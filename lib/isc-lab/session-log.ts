import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { IscLabSource } from "@/lib/isc-lab/retrieve-context";

export type IscLabMode = "chat" | "account_prep" | "voice_objection" | "battlecard" | "pre_call_brief";

export async function logIscLabInteraction(
  supabase: SupabaseClient<Database>,
  input: {
    userId: string;
    mode: IscLabMode;
    query: string;
    accountName?: string | null;
    reply: string;
    sources: IscLabSource[];
    model?: string | null;
    provider?: string | null;
    recommendedChallengeId?: string | null;
    recommendedCertType?: string | null;
    savedToPrepSessionId?: string | null;
  },
) {
  await supabase.from("isc_lab_interactions").insert({
    user_id: input.userId,
    mode: input.mode,
    query: input.query,
    account_name: input.accountName ?? null,
    reply_preview: input.reply.slice(0, 500),
    sources: input.sources.map((source) => ({
      url: source.url,
      title: source.title,
      source: source.source,
      fetchedAt: source.fetchedAt,
      contentVersion: source.contentVersion,
      kind: source.kind,
    })),
    model: input.model ?? null,
    provider: input.provider ?? null,
    recommended_challenge_id: input.recommendedChallengeId ?? null,
    recommended_cert_type: input.recommendedCertType ?? null,
    saved_to_prep_session_id: input.savedToPrepSessionId ?? null,
  });
}
