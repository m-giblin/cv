"use client";

import { BarChart3, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type LaunchRow = {
 id: string;
 name: string;
 project_tag: string;
 enrolled: number;
 started: number;
 completed: number;
};

export function ReleaseLaunchAnalytics() {
 const [rows, setRows] = useState<LaunchRow[]>([]);
 const [loading, setLoading] = useState(true);

 const load = useCallback(async () => {
 setLoading(true);
 const response = await fetch("/api/release-courses/analytics");
 if (response.ok) {
 const body = (await response.json()) as { launches: LaunchRow[] };
 setRows(body.launches ?? []);
 }
 setLoading(false);
 }, []);

 useEffect(() => {
 void load();
 }, [load]);

 return (
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <BarChart3 className="h-5 w-5 text-[#0071ce]" />
 Release launch analytics
 </CardTitle>
 <CardDescription>Initiative adoption — enrolled, started, and completed per release course.</CardDescription>
 </CardHeader>
 <div className="space-y-2 px-6 pb-6">
 {loading ? (
 <Loader2 className="mx-auto h-6 w-6 animate-spin text-stone-400" />
 ) : rows.length === 0 ? (
 <p className="text-sm text-stone-500">No release courses yet.</p>
 ) : (
 rows.map((row) => (
 <div className="flex flex-wrap items-center justify-between gap-2 border border-stone-200 p-3 text-sm" key={row.id}>
 <div>
 <p className="font-semibold">{row.name}</p>
 <p className="text-stone-500">{row.project_tag}</p>
 </div>
 <p className="text-stone-600">
 {row.enrolled} enrolled · {row.started} started · {row.completed} done
 </p>
 </div>
 ))
 )}
 </div>
 </Card>
 );
}
