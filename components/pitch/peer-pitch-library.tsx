"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { PitchPlaybackViewer } from "@/components/pitch/pitch-playback-viewer";
import { ScoreRing } from "@/components/se/northstar-animated";
import type { PeerPitch } from "@/lib/pitch/fetch-peer-pitches";

function pitchScore(pitch: PeerPitch) {
  return Math.round((((pitch.manager_grade ?? pitch.peer_avg ?? 0) / 5) * 100) || 0);
}

function scoreColor(score: number) {
  if (score >= 85) return "#0A6E45";
  if (score >= 75) return "#0071CE";
  return "#D4810A";
}

type PeerPitchLibraryProps = {
  initialPitches?: PeerPitch[];
  variant?: "default" | "compact";
};

export function PeerPitchLibrary({ initialPitches, variant = "default" }: PeerPitchLibraryProps) {
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

  if (variant === "compact") {
    return (
      <div className="px-4 py-3 pb-4">
        <p className="mb-2.5 font-display text-xs font-bold text-[#0D0E12]">Peer pitches — same scenario</p>
        {filtered.length === 0 ? (
          <p className="py-3 text-center text-[11px] text-[#A09D98]">
            No pitches yet — record yours or review a teammate&apos;s after manager approval.
          </p>
        ) : (
          <div className="space-y-1.5">
            {filtered.map((pitch) => {
              const score = pitchScore(pitch);
              return (
                <Link
                  className="block overflow-hidden border border-[#E2DFD9] bg-white hover:border-[#0071CE]/40"
                  href={`/pitch?review=${pitch.id}`}
                  key={pitch.id}
                >
                  <div className="relative flex h-20 items-center justify-center bg-[#0A0A0E]">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10">
                      <svg fill="white" height="12" viewBox="0 0 12 12" width="12">
                        <polygon points="3,1.5 10,6 3,10.5" />
                      </svg>
                    </div>
                    <span className="absolute bottom-1.5 right-2 font-mono text-[8px] text-white/50">1:00</span>
                    {score > 0 ? (
                      <span
                        className="absolute right-2 top-1.5 bg-black/60 px-1.5 py-0.5 font-mono text-[9px] font-medium"
                        style={{ color: scoreColor(score) }}
                      >
                        {score}
                      </span>
                    ) : null}
                  </div>
                  <div className="px-2.5 py-2">
                    <p className="text-[11.5px] font-medium text-[#0D0E12]">{pitch.personName}</p>
                    <p className="mt-0.5 font-mono text-[8.5px] text-[#A09D98]">
                      {pitch.title} · {new Date(pitch.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        <div className="mt-3 flex items-center gap-1.5 border-t border-[#E2DFD9] pt-3">
          <span className="mr-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#A09D98]">Show</span>
          <button
            className={`px-3 py-1.5 text-[11.5px] font-semibold ${
              filter === "all" ? "bg-[#0071ce] text-white" : "border border-[#E2DFD9] bg-white text-[#3D3C38]"
            }`}
            onClick={() => setFilter("all")}
            type="button"
          >
            All
          </button>
          <button
            className={`px-3 py-1.5 text-[11.5px] font-semibold ${
              filter === "endorsed" ? "bg-[#0071ce] text-white" : "border border-[#E2DFD9] bg-white text-[#3D3C38]"
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

  return (
    <div className="overflow-hidden border border-[#E2DFD9] bg-white">
      <div className="border-b border-[#ECEAE6] p-[16px_18px]">
        <p className="text-[15px] font-bold text-[#0D0E12]">Peer pitch library</p>
        <p className="mt-1 text-[12px] text-[#6B6860]">
          Manager-approved + peer-endorsed wins — structured rubric scores, inline playback, mentor picks.
        </p>
      </div>

      <div className="p-[16px_18px]">
        {filtered.length === 0 ? (
          <p className="py-4 text-center text-sm text-[#A09D98]">
            No pitches yet — record yours or review a teammate&apos;s after manager approval.
          </p>
        ) : (
          <div className="space-y-3">
            {filtered.map((pitch) => (
              <div className="overflow-hidden border border-[#E2DFD9] bg-white" key={pitch.id}>
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
                      <p className="text-[12.5px] font-bold text-[#0D0E12]">{pitch.title}</p>
                      {pitch.endorsement_count > 0 ? (
                        <Badge tone="amber">{pitch.endorsement_count} endorsements</Badge>
                      ) : null}
                    </div>
                    <p className="text-[11px] text-[#A09D98]">
                      {pitch.personName} · {new Date(pitch.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <ScoreRing
                    centerValue={`${pitchScore(pitch)}`}
                    className="shrink-0"
                    labelClassName="text-[#0D0E12] text-[13px]"
                    percent={pitchScore(pitch)}
                    progressClassName="stroke-[#be185d]"
                    size={48}
                    strokeWidth={10}
                    subClassName="text-[#A09D98]"
                    trackClassName="stroke-[#ECEAE6]"
                  />
                  <div className="flex gap-[7px]">
                    <button
                      className="inline-flex items-center border border-[#E2DFD9] bg-white px-[10px] py-[5px] text-[11px] font-semibold text-[#3D3C38]"
                      onClick={() => setExpandedId(expandedId === pitch.id ? null : pitch.id)}
                      type="button"
                    >
                      {expandedId === pitch.id ? "Hide playback" : "Watch inline"}
                    </button>
                    <Link
                      className="inline-flex items-center bg-[#ede9fe] px-[10px] py-[5px] text-[11px] font-semibold text-[#5b21b6]"
                      href={`/pitch?review=${pitch.id}`}
                    >
                      Full review →
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-[10px] border-t border-[#ECEAE6] bg-[#f9fafc] p-[10px_18px_14px] md:grid-cols-4">
                  {(pitch.competencies.length > 0
                    ? pitch.competencies.slice(0, 4)
                    : ["Clarity", "Value", "Objections", "Presence"]
                  ).map((label, index) => {
                    const pct = Math.max(
                      30,
                      Math.min(100, pitchScore(pitch) - 12 + index * 7),
                    );
                    return (
                      <div key={`${pitch.id}-${label}`}>
                        <div className="mb-[3px] flex justify-between">
                          <span className="text-[10px] text-[#6B6860]">{label}</span>
                          <span className="text-[10px] font-bold text-[#0D0E12]">{pct}</span>
                        </div>
                        <div className="h-[4px] overflow-hidden rounded-full bg-[#e8f2fc]">
                          <div className="h-full rounded-full bg-[#be185d]" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
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

      <div className="flex items-center gap-[6px] border-t border-[#ECEAE6] bg-[#F9F8F6] px-[18px] py-[12px]">
        <span className="mr-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#A09D98]">Show</span>
        <button
          className={`px-[12px] py-[6px] text-[11.5px] font-semibold transition ${
            filter === "all" ? "bg-[#0071ce] text-white" : "border border-[#E2DFD9] bg-white text-[#3D3C38] hover:bg-white"
          }`}
          onClick={() => setFilter("all")}
          type="button"
        >
          All
        </button>
        <button
          className={`px-[12px] py-[6px] text-[11.5px] font-semibold transition ${
            filter === "endorsed"
              ? "bg-[#0071ce] text-white"
              : "border border-[#E2DFD9] bg-white text-[#3D3C38] hover:bg-white"
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
