import { NextResponse } from "next/server";
import { formatTokenCount, loadAiUsageSummary } from "@/lib/ai/settings";
import { requireAdminSession } from "@/lib/auth/require-admin";

export async function GET() {
 const session = await requireAdminSession();
 if (session instanceof NextResponse) {
 return session;
 }

 const summary = await loadAiUsageSummary(session.supabase, session.tenantId ?? undefined);

 return NextResponse.json({
 ...summary,
 tokens30dLabel: formatTokenCount(summary.tokens30d),
 tokensTodayLabel: formatTokenCount(summary.tokensToday),
 });
}
