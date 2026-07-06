import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { fetchCorpusHealthReport, verifyCorpusAssetLink } from "@/lib/corpus/health";

export async function GET() {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const items = await fetchCorpusHealthReport(session.supabase);
  return NextResponse.json({ items, total: items.length });
}

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const body = (await request.json()) as { assetId?: string; verifyAll?: boolean };
  if (body.verifyAll) {
    const { data: assets } = await session.supabase
      .from("content_assets")
      .select("id")
      .like("storage_path", "http%");
    const results = await Promise.all(
      (assets ?? []).slice(0, 25).map((a) => verifyCorpusAssetLink(session.supabase, a.id)),
    );
    return NextResponse.json({ verified: results.length, broken: results.filter((r) => !r.ok).length });
  }

  if (!body.assetId) {
    return NextResponse.json({ error: "assetId required" }, { status: 400 });
  }

  const result = await verifyCorpusAssetLink(session.supabase, body.assetId);
  return NextResponse.json(result);
}
