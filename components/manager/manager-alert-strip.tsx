"use client";

import { AlertTriangle, Clock, UserX } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { AccountabilityMetrics } from "@/lib/development/plan-utils";

export function ManagerAlertStrip() {
 const [metrics, setMetrics] = useState<AccountabilityMetrics | null>(null);

 useEffect(() => {
 void fetch("/api/manager/accountability")
 .then((response) => response.json())
 .then((body: AccountabilityMetrics) => setMetrics(body));
 }, []);

 if (!metrics) {
 return null;
 }

 const alerts = [
 ...metrics.inactiveSes.slice(0, 3).map((item) => ({
 key: `inactive-${item.userId}`,
 label: `${item.fullName.split(" ")[0]} — inactive`,
 href: item.href,
 tone: "bg-red-50 text-red-800 border-red-200",
 icon: UserX,
 })),
 ...metrics.overdueGoalReviews
 .filter((item) => item.severity === "high")
 .slice(0, 2)
 .map((item) => ({
 key: `goal-${item.userId}`,
 label: `${item.fullName.split(" ")[0]} — goal review overdue`,
 href: item.href,
 tone: "bg-amber-50 text-amber-900 border-amber-200",
 icon: Clock,
 })),
 ...metrics.stuckPlanSteps.slice(0, 2).map((item) => ({
 key: `stuck-${item.userId}`,
 label: `${item.fullName.split(" ")[0]} — stuck on plan`,
 href: item.href,
 tone: "bg-amber-50 text-amber-900 border-amber-200",
 icon: AlertTriangle,
 })),
 ];

 if (alerts.length === 0) {
 return null;
 }

 return (
 <div className="flex flex-wrap gap-2">
 {alerts.map((alert) => {
 const Icon = alert.icon;
 return (
 <Link
 className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition hover:opacity-90 ${alert.tone}`}
 href={alert.href}
 key={alert.key}
 >
 <Icon className="h-3.5 w-3.5" />
 {alert.label}
 </Link>
 );
 })}
 </div>
 );
}
