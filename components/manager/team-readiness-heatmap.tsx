"use client";

import type { TeamReadinessRow } from "@/lib/manager/team-readiness";
import { Badge } from "@/components/ui/badge";

const COMPETENCIES = ["Discovery", "Executive Demo", "Objections", "Workflows", "Governance", "Agentic AI"];

function heatColor(score: number) {
 if (score >= 80) return "bg-emerald-500 text-white";
 if (score >= 65) return "bg-sky-400 text-white";
 if (score >= 50) return "bg-amber-400 text-amber-950";
 if (score > 0) return "bg-orange-300 text-orange-950";
 return "bg-stone-100 text-stone-400";
}

export function TeamReadinessHeatmap({
 rows,
 onSelectProfile,
}: {
 rows: TeamReadinessRow[];
 onSelectProfile?: (profileId: string) => void;
}) {
 if (rows.length === 0) {
 return null;
 }

 return (
 <div className="overflow-x-auto border border-sp-blue/10 bg-white p-4">
 <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
 <div>
 <h2 className="text-sm font-bold text-sp-navy">Team readiness heatmap</h2>
 <p className="text-xs text-sp-navy-muted">
 Sim scores by competency theme — click a row to open SE detail.
 </p>
 </div>
 <div className="flex flex-wrap gap-2 text-[10px] text-sp-navy-muted">
 <span className="inline-flex items-center gap-1">
 <span className="h-3 w-3 rounded bg-emerald-500" /> 80+
 </span>
 <span className="inline-flex items-center gap-1">
 <span className="h-3 w-3 rounded bg-sky-400" /> 65+
 </span>
 <span className="inline-flex items-center gap-1">
 <span className="h-3 w-3 rounded bg-amber-400" /> 50+
 </span>
 </div>
 </div>

 <table className="w-full min-w-[640px] text-left text-xs">
 <thead>
 <tr className="border-b border-sp-blue/10 text-[10px] uppercase tracking-wide text-sp-navy-muted">
 <th className="pb-2 pr-3 font-semibold">SE</th>
 <th className="pb-2 pr-3 font-semibold">Index</th>
 {COMPETENCIES.map((c) => (
 <th className="pb-2 px-1 text-center font-semibold" key={c}>
 {c.split(" ")[0]}
 </th>
 ))}
 </tr>
 </thead>
 <tbody>
 {rows.map((row) => (
 <tr
 className="border-b border-sp-blue/5 hover:bg-sp-blue-soft/20"
 key={row.profileId}
 >
 <td className="py-2 pr-3">
 <button
 className="text-left font-semibold text-sp-navy hover:underline"
 onClick={() => onSelectProfile?.(row.profileId)}
 type="button"
 >
 {row.fullName}
 </button>
 <div className="mt-0.5 flex gap-1">
 <Badge tone="blue">{row.level}</Badge>
 {row.trend === "up" ? <Badge tone="green">↑</Badge> : null}
 {row.trend === "down" ? <Badge tone="amber">↓</Badge> : null}
 </div>
 </td>
 <td className="py-2 pr-3">
 <span className="text-lg font-bold text-sp-navy">{row.readinessIndex}</span>
 </td>
 {COMPETENCIES.map((competency) => {
 const matched = Object.entries(row.competencyScores).find(([key]) =>
 key.toLowerCase().includes(competency.toLowerCase().split(" ")[0] ?? ""),
 );
 const score = matched?.[1] ?? 0;
 return (
 <td className="p-1 text-center" key={competency}>
 <span
 className={`inline-flex h-8 w-8 items-center justify-center text-[10px] font-bold ${heatColor(score)}`}
 title={`${competency}: ${score || "—"}`}
 >
 {score || "—"}
 </span>
 </td>
 );
 })}
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 );
}
