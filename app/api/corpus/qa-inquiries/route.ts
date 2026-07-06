import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { escalateStaleCorpusInquiries } from "@/lib/corpus/routing-dispatch";

const SLA_HOURS = 48;

function slaBadge(createdAt: string, escalatedAt: string | null) {
  const hours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  if (escalatedAt) {
    return { label: "Escalated", bg: "#fee2e2", color: "#dc2626" };
  }
  if (hours >= SLA_HOURS) {
    return { label: "Over SLA", bg: "#fee2e2", color: "#dc2626" };
  }
  if (hours >= SLA_HOURS * 0.75) {
    return { label: `${Math.round(SLA_HOURS - hours)}h left`, bg: "#fef3c7", color: "#b45309" };
  }
  return { label: "Within SLA", bg: "#dcfce7", color: "#15803d" };
}

export async function GET() {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  await escalateStaleCorpusInquiries(session.supabase);

  const [{ data: inquiries, error }, { data: rules }] = await Promise.all([
    session.supabase
      .from("corpus_qa_inquiries")
      .select(
        "id, user_id, question, asset_tags, routed_destination_type, routed_destination_address, status, created_at, escalated_at, profiles(full_name, email)",
      )
      .in("status", ["routed", "open", "pending"])
      .order("created_at", { ascending: false })
      .limit(50),
    session.supabase.from("corpus_routing_rules").select("id, tag, destination_address, label"),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const pending = inquiries ?? [];
  const withinSla = pending.filter((row) => {
    const hours = (Date.now() - new Date(row.created_at).getTime()) / (1000 * 60 * 60);
    return hours < SLA_HOURS && !row.escalated_at;
  });

  const smeSet = new Set((rules ?? []).map((r) => r.destination_address));

  return NextResponse.json({
    inquiries: pending.map((row) => ({
      ...row,
      sla: slaBadge(row.created_at, row.escalated_at),
      elapsedHours: Math.round((Date.now() - new Date(row.created_at).getTime()) / (1000 * 60 * 60)),
    })),
    stats: {
      withinSlaPct: pending.length ? Math.round((withinSla.length / pending.length) * 100) : 100,
      pendingCount: pending.length,
      activeRules: rules?.length ?? 0,
      smeCount: smeSet.size,
    },
  });
}
