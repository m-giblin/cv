import { NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/lib/auth/require-super-admin";
import { getMissionControlBundle } from "@/lib/platform/mission-control";
import { listSuperAdminOperators } from "@/lib/platform/operator-digest";

export async function GET() {
 const session = await requireSuperAdminSession();
 if (session instanceof NextResponse) return session;

 const [bundle, operators] = await Promise.all([getMissionControlBundle(), listSuperAdminOperators()]);

 return NextResponse.json({ ...bundle, operators });
}
