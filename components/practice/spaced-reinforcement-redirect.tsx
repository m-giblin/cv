"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function SpacedReinforcementRedirect({
 competency,
 autoAssign,
}: {
 competency?: string;
 autoAssign?: boolean;
}) {
 const router = useRouter();

 useEffect(() => {
 if (!autoAssign) return;

 void (async () => {
 const response = await fetch("/api/practice/spaced-reinforcement", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ competency }),
 });

 if (!response.ok) {
 return;
 }

 const body = (await response.json()) as { redirectUrl: string };
 router.replace(body.redirectUrl);
 })();
 }, [autoAssign, competency, router]);

 if (!autoAssign) return null;

 return (
 <div className="flex items-center gap-2 border border-sp-blue/15 bg-sp-blue-soft/30 px-4 py-3 text-sm text-sp-navy-muted">
 <Loader2 className="h-4 w-4 animate-spin text-sp-blue" />
 Assigning your {competency ? `${competency} ` : ""}reinforcement simulation…
 </div>
 );
}
