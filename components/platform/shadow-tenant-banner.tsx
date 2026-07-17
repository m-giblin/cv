"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const MODE_LABEL: Record<"admin" | "manager" | "se", string> = {
  admin: "Tenant Admin",
  manager: "Manager",
  se: "User",
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
    <div className="relative border-b border-[#BFDBFE] bg-[#EFF6FF] px-4 py-2.5 text-sm text-[#1E3A5F]">
      <p className="mx-auto max-w-3xl text-center leading-snug">
        <span className="font-semibold">{MODE_LABEL[mode]}:</span> working in{" "}
        <span className="font-semibold">{tenantName}</span>
        <span className="text-[#64748B]"> — switch workspaces anytime · Super Admin returns to Platform</span>
      </p>
      <Button
        className="absolute right-4 top-1/2 -translate-y-1/2"
        disabled={exiting}
        onClick={() => void backToPlatform()}
        size="sm"
        type="button"
        variant="outline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {exiting ? "Returning…" : "Super Admin"}
      </Button>
    </div>
  );
}
