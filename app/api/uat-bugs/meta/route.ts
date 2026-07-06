import { NextResponse } from "next/server";
import { requireAuthenticatedSession } from "@/lib/auth/require-authenticated";
import {
  FORGE_ASSIGNEE_EMAIL,
  FORGE_ASSIGNEE_NAME,
  FORGE_FALLBACK_CATEGORIES,
  FORGE_PRIORITIES,
  FORGE_PROJECT_KEY,
  FORGE_STATUSES,
  getForgeAssigneeIdFromEnv,
  isForgeConfigured,
} from "@/lib/forge/config";
import { ForgeApiError, listForgeCategories, resolveForgeAssigneeId } from "@/lib/forge/client";

export async function GET() {
  const session = await requireAuthenticatedSession();
  if (session instanceof NextResponse) {
    return session;
  }

  if (!isForgeConfigured()) {
    return NextResponse.json({ enabled: false, reason: "missing_api_key" });
  }

  let categories: { id: string; name: string }[] = FORGE_FALLBACK_CATEGORIES.map((item) => ({
    id: item.id,
    name: item.name,
  }));
  let assigneeId = getForgeAssigneeIdFromEnv();
  let forgeReachable = true;
  let forgeError: string | undefined;

  try {
    const [forgeCategories, resolvedAssignee] = await Promise.all([
      listForgeCategories(),
      assigneeId ? Promise.resolve(assigneeId) : resolveForgeAssigneeId(),
    ]);
    if (forgeCategories.length > 0) {
      categories = forgeCategories.map((item) => ({ id: item.id, name: item.name }));
    }
    assigneeId = resolvedAssignee;
  } catch (error) {
    forgeReachable = false;
    forgeError =
      error instanceof ForgeApiError
        ? `Forge API error (${error.status}). Check FORGE_API_KEY and Forge deployment.`
        : "Could not reach Forge API.";
  }

  return NextResponse.json({
    enabled: true,
    forgeReachable,
    forgeError,
    projectKey: FORGE_PROJECT_KEY,
    assigneeName: FORGE_ASSIGNEE_NAME,
    assigneeEmail: FORGE_ASSIGNEE_EMAIL,
    assigneeId,
    categories,
    priorities: FORGE_PRIORITIES,
    statuses: FORGE_STATUSES,
    forgeUrl: process.env.FORGE_API_BASE_URL ?? "https://forge-nu-ochre.vercel.app",
  });
}
