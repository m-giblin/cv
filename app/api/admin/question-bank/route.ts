import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { loadBank } from "@/lib/question-bank/data";

/** The whole bank with stats, for the admin page. */
export async function GET() {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;
  const bank = await loadBank(session.tenantId);
  if (!bank) return NextResponse.json({ error: "The question bank isn't set up yet. Apply its database migration." }, { status: 503 });
  return NextResponse.json(bank);
}
