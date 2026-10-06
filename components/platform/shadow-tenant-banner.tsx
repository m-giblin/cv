"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const MODE_LABEL: Record<"admin" | "manager" | "se", string> = {
  admin: "Tenant admin",
  manager: "Manager",
  se: "Sales engineer",
};

export function ShadowTenantBanner({
  tenantName,
  mode,
}: {
  tenantName: string;
  mode: "admin" | "manager" | "se";
}) {
  const router = useRouter();
  const [exiting, setExiting] = useState(false);

  async function backToPlatform() {
    setExiting(true);
    const switchResponse = await fetch("/api/workspace/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hat: "platform" }),
    });
    if (switchResponse.ok) {
      setExiting(false);
      router.push("/platform");
      router.refresh();
      return;
    }

    const response = await fetch("/api/platform/shadow", {
      method: "DELETE",
      headers: { "x-requested-with": "XMLHttpRequest" },
    });
    setExiting(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      toast.error(body?.error ?? "Could not return to Platform.");
      return;
    }

    const body = (await response.json()) as { redirect?: string };
    router.push(body.redirect ?? "/platform");
    router.refresh();
  }

  return (
    <div
      aria-label="Shadow session"
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-signal-edge/40 bg-signal-soft px-[var(--page-pad-x)] py-2.5 text-ink max-lg:px-4"
      role="region"
    >
      <p className="text-sm leading-snug text-ink">
        <span className="font-bold">Shadowing</span> {tenantName} as{" "}
        <span className="font-semibold">{MODE_LABEL[mode].toLowerCase()}</span>.
        <span className="text-ink-2"> Switch workspaces any time, or return to the platform console.</span>
      </p>
      <button className="btn-secondary shrink-0" disabled={exiting} onClick={() => void backToPlatform()} type="button">
        {exiting ? "Returning…" : "Back to platform"}
      </button>
    </div>
  );
}
