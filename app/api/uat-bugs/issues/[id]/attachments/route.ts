import { NextResponse } from "next/server";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";
import { ForgeApiError, uploadForgeAttachment } from "@/lib/forge/client";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
 const session = await requireAuthenticatedSession();
 if (session instanceof NextResponse) {
 return session;
 }

 const { id } = await params;
 const form = await request.formData();
 const file = form.get("file");

 if (!(file instanceof File)) {
 return NextResponse.json({ error: 'Missing "file" in form data.' }, { status: 400 });
 }

 try {
 await uploadForgeAttachment(id, file, file.name);
 return NextResponse.json({ ok: true }, { status: 201 });
 } catch (error) {
 const message = error instanceof ForgeApiError ? error.message : "Failed to upload attachment.";
 return NextResponse.json({ error: message }, { status: 502 });
 }
}
