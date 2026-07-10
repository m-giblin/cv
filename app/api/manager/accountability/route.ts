import { NextResponse } from "next/server";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { getDashboardData } from "@/lib/data/get-dashboard-data";
import { fetchDevelopmentPlans } from "@/lib/data/get-development-data";
import { buildAccountabilityMetrics } from "@/lib/development/plan-utils";

export async function GET() {
 const session = await requireManagerSession();
 if (session instanceof NextResponse) {
 return session;
 }

 const { data } = await getDashboardData();
 const orgIds = data.myOrg.map((profile) => profile.id);
 const developmentPlans = await fetchDevelopmentPlans(orgIds);

 const metrics = buildAccountabilityMetrics(data, developmentPlans, data.myOrg);

 return NextResponse.json(metrics);
}
