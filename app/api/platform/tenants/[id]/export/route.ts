import { NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/lib/auth/require-super-admin";
import { getTenantExportArtifact, queueTenantExport } from "@/lib/platform/tenant-export";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const session = await requireSuperAdminSession();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;

  try {
    const tenant = await queueTenantExport(id, session.user.id);
    return NextResponse.json({ tenant });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to queue tenant export." },
      { status: 500 },
    );
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const session = await requireSuperAdminSession();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;

  try {
    const artifact = await getTenantExportArtifact(id);
    if (!artifact.content) {
      return NextResponse.json(
        { error: `Export is not ready (status: ${artifact.status}).`, status: artifact.status },
        { status: 409 },
      );
    }

    return new NextResponse(artifact.content, {
      status: 200,
      headers: {
        "Content-Type": artifact.contentType,
        "Content-Disposition": `attachment; filename="${artifact.filename}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to download tenant export." },
      { status: 500 },
    );
  }
}
