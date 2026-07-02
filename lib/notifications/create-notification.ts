import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/lib/database.types";

export async function createNotification(
  supabase: SupabaseClient<Database>,
  params: {
    userId: string;
    title: string;
    body: string;
    actionUrl?: string;
  },
) {
  await supabase.from("notifications").insert({
    user_id: params.userId,
    title: params.title,
    body: params.body,
    action_url: params.actionUrl ?? null,
  });
}
