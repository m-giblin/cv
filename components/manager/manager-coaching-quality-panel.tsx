"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { ManagerCoachingQuality } from "@/lib/coaching/manager-quality";

export function ManagerCoachingQualityPanel({ orgIds }: { orgIds: string[] }) {
  const [rows, setRows] = useState<ManagerCoachingQuality[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const query = orgIds.length ? `?orgIds=${orgIds.join(",")}` : "";
    void fetch(`/api/manager/coaching-quality${query}`)
      .then((response) => (response.ok ? response.json() : { quality: [] }))
      .then((body: { quality: ManagerCoachingQuality[] }) => setRows(body.quality ?? []))
      .finally(() => setLoading(false));
  }, [orgIds]);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-[#0071ce]" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="text-[11px] text-[#6B6860]">Coaching quality metrics appear after structured sign-offs.</p>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div className="border border-[#E2DFD9] bg-white p-3" key={row.managerId}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12px] font-bold text-[#0D0E12]">{row.managerName}</p>
            <span
              className="font-mono text-[9px] font-bold uppercase tracking-wide px-2 py-0.5"
              style={{
                background: row.qualityScore >= 75 ? "#EDFAF3" : row.qualityScore >= 55 ? "#FEF3C7" : "#FEF0EE",
                color: row.qualityScore >= 75 ? "#0A6E45" : row.qualityScore >= 55 ? "#b45309" : "#B83128",
              }}
            >
              Quality {row.qualityScore}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              <p className="font-mono text-[8px] uppercase text-[#A09D98]">Sign-offs (30d)</p>
              <p className="text-[13px] font-bold text-[#0D0E12]">{row.totalSignoffs}</p>
            </div>
            <div>
              <p className="font-mono text-[8px] uppercase text-[#A09D98]">Avg review time</p>
              <p className="text-[13px] font-bold text-[#0D0E12]">
                {row.avgReviewDurationMs ? `${Math.round(row.avgReviewDurationMs / 1000)}s` : "—"}
              </p>
            </div>
            <div>
              <p className="font-mono text-[8px] uppercase text-[#A09D98]">AI edited</p>
              <p className="text-[13px] font-bold text-[#0D0E12]">{Math.round(row.aiEditRate * 100)}%</p>
            </div>
            <div>
              <p className="font-mono text-[8px] uppercase text-[#A09D98]">Cadence risk</p>
              <p className="text-[13px] font-bold text-[#0D0E12]">{row.cadenceRiskCount} SEs</p>
            </div>
          </div>
          {row.flags.length > 0 ? (
            <ul className="mt-2 space-y-0.5 text-[10px] text-[#b45309]">
              {row.flags.map((flag) => (
                <li key={flag}>• {flag}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[10px] text-[#0A6E45]">Coaching patterns look healthy.</p>
          )}
        </div>
      ))}
    </div>
  );
}
