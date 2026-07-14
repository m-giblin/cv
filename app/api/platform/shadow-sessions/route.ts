import { NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/lib/auth/require-super-admin";
import { listShadowSessions } from "@/lib/platform/shadow-sessions";

export async function GET(request: Request) {
 const session = await requireSuperAdminSession();
 if (session instanceof NextResponse) return session;

 const { searchParams } = new URL(request.url);
 const hours = Number(searchParams.get("hours") ?? "168");
 const limit = Number(searchParams.get("limit") ?? "50");

 const sessions = await listShadowSessions({
 hours: Number.isFinite(hours) ? hours : 168,
 limit: Number.isFinite(limit) ? Math.min(limit, 200) : 50,
 });

 return NextResponse.json({ sessions });
}
