"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ShadowTenantBanner({
 tenantName,
 mode,
}: {
 tenantName: string;
 mode: "admin" | "se";
}) {
 const router = useRouter();
 const [exiting, setExiting] = useState(false);

 async function exitShadow() {
 setExiting(true);
 const response = await fetch("/api/platform/shadow", {
 method: "DELETE",
 headers: { "x-requested-with": "XMLHttpRequest" },
 });
 setExiting(false);

 if (!response.ok) {
 const body = (await response.json().catch(() => null)) as { error?: string } | null;
 toast.error(body?.error ?? "Could not exit shadow mode.");
 return;
 }

 const body = (await response.json()) as { redirect?: string };
 router.push(body.redirect ?? "/platform");
 router.refresh();
 }

 return (
 <div className="relative border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-950">
 <p className="mx-auto max-w-3xl text-center leading-snug">
 <span className="font-semibold">Shadow mode ({mode === "se" ? "SE training" : "tenant admin"}):</span>{" "}
 {mode === "se" ? "experiencing" : "administering"}{" "}
 <span className="font-semibold">{tenantName}</span>. Actions are audited.
 </p>
 <Button
 className="absolute right-4 top-1/2 -translate-y-1/2"
 disabled={exiting}
 onClick={() => void exitShadow()}
 size="sm"
 type="button"
 variant="outline"
 >
 <LogOut className="h-3.5 w-3.5" />
 {exiting ? "Exiting…" : "Exit shadow"}
 </Button>
 </div>
 );
}
