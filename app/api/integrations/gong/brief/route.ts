import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchGongCallBrief } from "@/lib/integrations/gong-brief";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  accountName: z.string().min(2),
});

export async function POST(request: Request) {
  const session = await requireAuthenticatedSession();
  if (session instanceof NextResponse) return session;

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createClient();
  let oauthToken: string | null = null;

  if (supabase) {
    const { data: connection } = await supabase
      .from("integration_connections")
      .select("access_token, expires_at")
      .eq("user_id", session.user.id)
      .eq("provider", "gong")
      .maybeSingle();

    if (connection?.access_token) {
      const expired = connection.expires_at && new Date(connection.expires_at) < new Date();
      if (!expired) oauthToken = connection.access_token;
    }
  }

  const brief = await fetchGongCallBrief(parsed.data.accountName, { oauthToken });
  return NextResponse.json({ brief });
}
