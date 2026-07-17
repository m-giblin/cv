import { NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/lib/auth/require-super-admin";
import { getTenantUsageFleet } from "@/lib/platform/usage-fleet";

export async function GET() {
  const session = await requireSuperAdminSession();
  if (session instanceof NextResponse) return session;

  const fleet = await getTenantUsageFleet();
  return NextResponse.json(fleet);
}
