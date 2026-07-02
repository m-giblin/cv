import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/auth/require-admin";

function mapRow(row: {
  id: string;
  title: string;
  description: string | null;
  storage_path: string;
  content_type: string | null;
  linked_solutions: string[];
  created_at: string;
  updated_at: string;
}) {
  return {
    id: row.id,
    title: row.title,
    category: row.description ?? "reference",
    url: row.storage_path,
    contentType: row.content_type,
    linkedSolutions: row.linked_solutions ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET() {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) {
    return session;
  }

  const { data, error } = await session.supabase
    .from("content_assets")
    .select("*")
    .order("title");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ assets: (data ?? []).map(mapRow) });
}

const schema = z.object({
  title: z.string().min(2),
  url: z.string().url(),
  category: z.string().min(2),
});

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) {
    return session;
  }

  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { error } = await session.supabase.from("content_assets").insert({
    title: parsed.data.title,
    description: parsed.data.category,
    storage_path: parsed.data.url,
    content_type: "external_link",
    created_by: session.user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
