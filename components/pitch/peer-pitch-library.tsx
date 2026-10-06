"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PitchPlaybackViewer } from "@/components/pitch/pitch-playback-viewer";
import { H2_CLS, LINE_CARD_CLS } from "@/components/se/form-classes";
import { Chip } from "@/components/ui/chip";
import { Tag } from "@/components/ui/tag";
import type { PeerPitch } from "@/lib/pitch/fetch-peer-pitches";

function pitchScore(pitch: PeerPitch) {
  return Math.round((((pitch.manager_grade ?? pitch.peer_avg ?? 0) / 5) * 100) || 0);
}

function scoreTextClass(score: number) {
  if (score < 60) return "text-danger";
  if (score < 70) return "text-warning";
  return "text-blue";
}

const EMPTY_CLS =
  "rounded-[14px] border border-dashed border-line-strong p-7 text-center text-[15px] text-muted";

function FilterChips({
  filter,
  onChange,
}: {
  filter: "all" | "endorsed";
  onChange: (value: "all" | "endorsed") => void;
}) {
  return (
    <div aria-label="Filter peer pitches" className="flex flex-wrap items-center gap-2" role="group">
      <span className="label-caps mr-1">Show</span>
      <Chip active={filter === "all"} onClick={() => onChange("all")}>
        All
      </Chip>
      <Chip active={filter === "endorsed"} onClick={() => onChange("endorsed")}>
        Mentor picks
      </Chip>
    </div>
  );
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
      <div className="px-5 py-4">
        <h2 className="mb-3 text-[15px] font-bold text-ink">Peer pitches</h2>
        {filtered.length === 0 ? (
          <p className="rounded-[14px] border border-dashed border-line-strong p-4 text-center text-sm text-muted">
            No pitches yet. Record yours, or review a teammate&apos;s once a manager approves it.
          </p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((pitch) => {
              const score = pitchScore(pitch);
              return (
                <li key={pitch.id}>
                  <Link
                    className="block overflow-hidden rounded-[14px] border border-line bg-white hover:border-blue"
                    href={`/practice/pitch?review=${pitch.id}`}
                  >
                    <div className="relative flex h-20 items-center justify-center bg-ink">
                      <span
                        aria-hidden="true"
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-on-blue-muted"
                      >
                        <svg fill="currentColor" className="text-white" height="12" viewBox="0 0 12 12" width="12">
                          <polygon points="3,1.5 10,6 3,10.5" />
                        </svg>
                      </span>
                      {score > 0 ? (
                        <span className="num absolute right-2 top-1.5 text-[13px] font-bold text-white">
                          {score}
                          <span className="sr-only"> out of 100</span>
                        </span>
                      ) : null}
                    </div>
                    <div className="px-3.5 py-2.5">
                      <p className="text-sm font-bold text-ink">{pitch.personName}</p>
                      <p className="mt-0.5 text-[13px] text-muted">
                        {pitch.title},{" "}
                        {new Date(pitch.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-3 border-t border-divider pt-3">
          <FilterChips filter={filter} onChange={setFilter} />
        </div>
      </div>
    );
  }

  return (
    <section aria-labelledby="peer-pitch-library-heading" className={`${LINE_CARD_CLS} overflow-hidden`}>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-divider px-5 py-4">
        <div>
          <h2 className={H2_CLS} id="peer-pitch-library-heading">
            Peer pitch library
          </h2>
          <p className="mt-1 text-sm text-ink-2">
            Pitches your managers approved and your peers endorsed. Watch them inline.
          </p>
        </div>
        <FilterChips filter={filter} onChange={setFilter} />
      </div>

      {filtered.length === 0 ? (
        <div className="p-5">
          <p className={EMPTY_CLS}>No pitches yet. Record yours, or review a teammate&apos;s once a manager approves it.</p>
        </div>
      ) : (
        <ul>
          {filtered.map((pitch, rowIndex) => {
            const score = pitchScore(pitch);
            const expanded = expandedId === pitch.id;
            return (
              <li className={rowIndex > 0 ? "border-t border-divider" : undefined} key={pitch.id}>
                <div className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <p className="text-[15px] font-bold text-ink">{pitch.title}</p>
                      {pitch.endorsement_count > 0 ? (
                        <Tag tone="warning">
                          {pitch.endorsement_count} {pitch.endorsement_count === 1 ? "endorsement" : "endorsements"}
                        </Tag>
                      ) : null}
                    </div>
                    <p className="text-[13px] text-muted">
                      {pitch.personName},{" "}
                      {new Date(pitch.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`num text-[30px] font-extrabold leading-none tracking-[-0.03em] ${scoreTextClass(score)}`}>
                      {score}
                    </p>
                    <p className="mt-1 text-[13px] text-muted">Score</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      aria-expanded={expanded}
                      className="btn-secondary"
                      onClick={() => setExpandedId(expanded ? null : pitch.id)}
                      type="button"
                    >
                      {expanded ? "Hide playback" : "Watch inline"}
                    </button>
                    <Link className="link text-sm" href={`/practice/pitch?review=${pitch.id}`}>
                      Full review
                    </Link>
                  </div>
                </div>

                {pitch.competencies.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 px-5 pb-1">
                    {pitch.competencies.slice(0, 4).map((label) => (
                      <Tag key={`${pitch.id}-${label}`}>{label}</Tag>
                    ))}
                  </div>
                ) : null}

                {pitch.manager_grade || pitch.peer_avg ? (
                  <div className="flex flex-wrap gap-1.5 px-5 pb-3 pt-1">
                    {pitch.manager_grade ? <Tag tone="success">Manager {pitch.manager_grade} of 5</Tag> : null}
                    {pitch.peer_avg ? <Tag tone="blue">Peers {pitch.peer_avg.toFixed(1)} of 5</Tag> : null}
                  </div>
                ) : null}
                {expanded ? (
                  <div className="px-5 pb-5 pt-2">
                    <PitchPlaybackViewer submissionId={pitch.id} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
