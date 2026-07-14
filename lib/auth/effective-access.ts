import "server-only";

import { cookies } from "next/headers";
import {
  resolveEffectiveAccess,
  SHADOW_TENANT_COOKIE,
  SHADOW_TENANT_NAME_COOKIE,
  SHADOW_MODE_COOKIE,
  type EffectiveAccess,
} from "@/lib/auth/shadow-tenant";
import type { ProfileRole } from "@/lib/types";

export async function getEffectiveAccess(
  role: ProfileRole,
  profileTenantId: string | null,
): Promise<EffectiveAccess> {
  const cookieStore = await cookies();

  return resolveEffectiveAccess(
    role,
    profileTenantId,
    cookieStore.get(SHADOW_TENANT_COOKIE)?.value ?? null,
    cookieStore.get(SHADOW_TENANT_NAME_COOKIE)?.value ?? null,
    cookieStore.get(SHADOW_MODE_COOKIE)?.value ?? null,
  );
}
