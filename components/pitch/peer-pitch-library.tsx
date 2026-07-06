"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { PitchPlaybackViewer } from "@/components/pitch/pitch-playback-viewer";
import { ScoreRing } from "@/components/se/northstar-animated";
import type { PeerPitch } from "@/lib/pitch/fetch-peer-pitches";

type PeerPitchLibraryProps = {
  initialPitches?: PeerPitch[];
};

export function PeerPitchLibrary({ initialPitches }: PeerPitchLibraryProps) {
  const [pitches, setPitches] = useState<PeerPitch[]>(initialPitches ?? []);
  const [filter, setFilter] = useState<"all" | "endorsed">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (initialPitches !== undefined) {
      return;
    }

    void fetch("/api/pitch/library")
      .then((response) => (response.ok ? response.json() : { pitches: [] }))
      .then((body: { pitches: PeerPitch[] }) => setPitches(body.pitches ?? []))
      .catch(() => setPitches([]));
  }, [initialPitches]);

  const filtered = useMemo(() => {
    if (filter === "endorsed") return pitches.filter((p) => p.endorsement_count > 0);
    return pitches;
  }, [filter, pitches]);

  return (
    <div className="overflow-hidden rounded-xl border border-[#e2eaf5] bg-white shadow-[0_1px_4px_rgba(0,20,58,0.04)]">
      <div className="border-b border-[#f1f5f9] p-[16px_18px]">
        <p className="text-[15px] font-bold text-[#0a1628]">Peer pitch library</p>
        <p className="mt-1 text-[12px] text-[#64748b]">
          Manager-approved + peer-endorsed wins — structured rubric scores, inline playback, mentor picks.
        </p>
      </div>

      <div className="p-[16px_18px]">
        {filtered.length === 0 ? (
          <p className="py-4 text-center text-sm text-[#94a3b8]">
            No pitches yet — record yours or review a teammate&apos;s after manager approval.
          </p>
        ) : (
          <div className="space-y-3">
            {filtered.map((pitch) => (
            <div className="overflow-hidden rounded-xl border border-[#e2eaf5] bg-white" key={pitch.id}>
              <div className="flex flex-wrap items-center gap-[12px] p-[14px_18px]">
                <button
                  className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full bg-[#ede9fe]"
                  onClick={() => setExpandedId(expandedId === pitch.id ? null : pitch.id)}
                  type="button"
                >
                  <svg fill="#5b21b6" height="14" viewBox="0 0 16 16" width="14">
                    <path d="M4 3l10 5-10 5z" />
                  </svg>
                </button>
                <div className="min-w-0 flex-1">
                  <div className="mb-[3px] flex flex-wrap items-center gap-[7px]">
                    <p className="text-[12.5px] font-bold text-[#0a1628]">{pitch.title}</p>
                    {pitch.endorsement_count > 0 ? <Badge tone="amber">{pitch.endorsement_count} endorsements</Badge> : null}
                  </div>
                  <p className="text-[11px] text-[#94a3b8]">
                    {pitch.personName} · {new Date(pitch.created_at).toLocaleDateString()}
                  </p>
                </div>
                <ScoreRing
                  centerValue={`${Math.round((((pitch.manager_grade ?? pitch.peer_avg ?? 0) / 5) * 100) || 0)}`}
                  className="shrink-0"
                  labelClassName="text-[#0a1628] text-[13px]"
                  percent={Math.round((((pitch.manager_grade ?? pitch.peer_avg ?? 0) / 5) * 100) || 0)}
                  progressClassName="stroke-[#be185d]"
                  size={48}
                  strokeWidth={10}
                  subClassName="text-[#94a3b8]"
                  trackClassName="stroke-[#f1f5f9]"
                />
                <div className="flex gap-[7px]">
                  <button
                    className="inline-flex items-center rounded-md border border-[#e2eaf5] bg-white px-[10px] py-[5px] text-[11px] font-semibold text-[#334155]"
                    onClick={() => setExpandedId(expandedId === pitch.id ? null : pitch.id)}
                    type="button"
                  >
                    {expandedId === pitch.id ? "Hide playback" : "Watch inline"}
                  </button>
                  <Link
                    className="inline-flex items-center rounded-md bg-[#ede9fe] px-[10px] py-[5px] text-[11px] font-semibold text-[#5b21b6]"
                    href={`/pitch?review=${pitch.id}`}
                  >
                    Full review →
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-[10px] border-t border-[#f1f5f9] bg-[#f9fafc] p-[10px_18px_14px] md:grid-cols-4">
                {(pitch.competencies.length > 0 ? pitch.competencies.slice(0, 4) : ["Clarity", "Value", "Objections", "Presence"]).map(
                  (label, index) => {
                    const pct = Math.max(
                      30,
                      Math.min(
                        100,
                        Math.round((((pitch.manager_grade ?? pitch.peer_avg ?? 3) / 5) * 100) - 12 + index * 7),
                      ),
                    );
                    return (
                      <div key={`${pitch.id}-${label}`}>
                        <div className="mb-[3px] flex justify-between">
                          <span className="text-[10px] text-[#64748b]">{label}</span>
                          <span className="text-[10px] font-bold text-[#0a1628]">{pct}</span>
                        </div>
                        <div className="h-[4px] overflow-hidden rounded-full bg-[#e8f2fc]">
                          <div className="h-full rounded-full bg-[#be185d]" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  },
                )}
              </div>

              {pitch.manager_grade || pitch.peer_avg ? (
                <div className="px-[18px] pb-2 pt-2">
                  <div className="flex flex-wrap gap-1">
                    {pitch.manager_grade ? <Badge tone="green">Mgr {pitch.manager_grade}/5</Badge> : null}
                    {pitch.peer_avg ? <Badge tone="blue">Peers {pitch.peer_avg.toFixed(1)}/5</Badge> : null}
                  </div>
                </div>
              ) : null}
              {expandedId === pitch.id ? (
                <div className="mt-3">
                  <PitchPlaybackViewer submissionId={pitch.id} />
                </div>
              ) : null}
            </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-[6px] border-t border-[#f1f5f9] bg-[#f8fafd] px-[18px] py-[12px]">
        <span className="mr-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#94a3b8]">
          Show
        </span>
        <button
          className={`rounded-lg px-[12px] py-[6px] text-[11.5px] font-semibold transition ${
            filter === "all" ? "bg-[#0071ce] text-white" : "border border-[#e2eaf5] bg-white text-[#475569] hover:bg-white"
          }`}
          onClick={() => setFilter("all")}
          type="button"
        >
          All
        </button>
        <button
          className={`rounded-lg px-[12px] py-[6px] text-[11.5px] font-semibold transition ${
            filter === "endorsed"
              ? "bg-[#0071ce] text-white"
              : "border border-[#e2eaf5] bg-white text-[#475569] hover:bg-white"
          }`}
          onClick={() => setFilter("endorsed")}
          type="button"
        >
          Mentor picks
        </button>
      </div>
    </div>
  );
}
