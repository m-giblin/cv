"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { WorkspaceHat } from "@/lib/auth/workspace";
import type { PlatformFeatureFlags } from "@/lib/platform/settings-shared";
import { mergeFeatureFlags } from "@/lib/platform/settings-shared";

const CACHE_KEY = "tenant-feature-flags";
const CACHE_MS = 2 * 60_000;
/** The shell stays mounted across navigation, so re-check on page changes, at most this often. */
const REFRESH_MS = 30_000;

/** Tenant feature flags used to hide nav entries for switched-off areas (SE workspace only). */
export function useNavFlags(workspace: WorkspaceHat): PlatformFeatureFlags | undefined {
  const [flags, setFlags] = useState<PlatformFeatureFlags | undefined>(undefined);
  const pathname = usePathname();
  const lastFetchAt = useRef(0);

  useEffect(() => {
    if (workspace !== "se") return;
    if (Date.now() - lastFetchAt.current < REFRESH_MS) return;
    lastFetchAt.current = Date.now();

    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const { flags: stored, at } = JSON.parse(cached) as { flags: PlatformFeatureFlags; at: number };
        if (Date.now() - at < CACHE_MS) setFlags(mergeFeatureFlags(stored));
      }
    } catch {
      // storage unavailable or corrupt: fall through to the fetch
    }

    void fetch("/api/tenant/feature-flags", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { featureFlags: {} }))
      .then((body: { featureFlags?: PlatformFeatureFlags }) => {
        const merged = mergeFeatureFlags(body.featureFlags);
        setFlags(merged);
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ flags: merged, at: Date.now() }));
        } catch {
          // ignore
        }
      })
      .catch(() => setFlags(mergeFeatureFlags({})));
  }, [workspace, pathname]);

  return flags;
}
