import { NextResponse } from "next/server";
import { requireManagerSession } from "@/lib/auth/require-manager";
import { loadProgramTracks } from "@/lib/programs/tracks";

/** Programs with their stages and steps, for the timeline view (admins and managers). */
export async function GET() {
  const session = await requireManagerSession();
  if (session instanceof NextResponse) return session;
  return NextResponse.json({ tracks: await loadProgramTracks(session.tenantId) });
}
