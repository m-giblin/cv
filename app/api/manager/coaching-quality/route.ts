import { NextResponse } from "next/server";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { buildManagerCoachingQuality } from "@/lib/coaching/manager-quality";
import { uniqueIds } from "@/lib/utils";

export async function GET(request: Request) {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) return session;

  const params = new URL(request.url).searchParams;
  const orgIds = uniqueIds(
    (params.get("orgIds") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );

  let managerIds: string[] = [];
  if (params.get("managerId")) {
    managerIds = [params.get("managerId")!];
  } else if (session.role === "director" || session.role === "admin" || session.role === "super_admin") {
    const { data: managers } = await session.supabase
      .from("profiles")
      .select("id")
      .in("role", ["manager", "director"])
      .eq("tenant_id", session.tenantId);
    managerIds = (managers ?? []).map((row) => row.id);
    if (managerIds.length === 0) managerIds = [session.user.id];
  } else {
    managerIds = [session.user.id];
  }

  const quality = await buildManagerCoachingQuality(session.supabase, managerIds, orgIds);

  return NextResponse.json({ quality, viewerId: session.user.id });
}
