import { NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/lib/auth/require-super-admin";
import { listSupportRequests } from "@/lib/tenant/support-requests";
import type { SupportStatus } from "@/lib/tenant/types";

export async function GET(request: Request) {
 const session = await requireSuperAdminSession();
 if (session instanceof NextResponse) return session;

 const { searchParams } = new URL(request.url);
 const tenantId = searchParams.get("tenantId") ?? undefined;
 const status = searchParams.get("status") as SupportStatus | "active" | null;

 const tickets = await listSupportRequests({
 tenantId,
 status: status ?? undefined,
 limit: 200,
 });

 return NextResponse.json({ tickets });
}
