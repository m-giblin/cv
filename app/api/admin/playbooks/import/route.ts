import mammoth from "mammoth";
import { NextResponse } from "next/server";
import { auditMutation } from "@/lib/audit/audit-mutation";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { insertParsedGuide } from "@/lib/playbooks/data";
import { parseFieldGuide } from "@/lib/playbooks/parse-field-guide";

const MAX_BYTES = 15 * 1024 * 1024;

/** Imports a field guide (.docx) as a new guide with every chapter in draft for review. */
export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (session instanceof NextResponse) return session;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a .docx file to import." }, { status: 400 });
  if (!file.name.toLowerCase().endsWith(".docx")) {
    return NextResponse.json({ error: "Only Word (.docx) files can be imported." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "That file is over 15 MB." }, { status: 400 });

  let text: string;
  try {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(await file.arrayBuffer()) });
    text = result.value;
  } catch {
    return NextResponse.json({ error: "That file couldn't be read as a Word document." }, { status: 400 });
  }

  const parsed = parseFieldGuide(text);
  if (!parsed.playbooks.length) {
    return NextResponse.json({ error: parsed.warnings[0] ?? "No chapters found in that document." }, { status: 422 });
  }

  const saved = await insertParsedGuide(session.tenantId, session.user.id, parsed, file.name);
  if ("error" in saved) return NextResponse.json({ error: saved.error }, { status: 500 });

  auditMutation(
    session.user.id,
    "playbook.imported",
    "playbook_guide",
    saved.guideId,
    { source: file.name, chapters: parsed.playbooks.length, warnings: parsed.warnings.length },
    session.tenantId,
  );
  return NextResponse.json({ guideId: saved.guideId, chapters: parsed.playbooks.length, warnings: parsed.warnings });
}
