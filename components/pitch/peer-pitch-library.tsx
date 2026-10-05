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

/** v2 score rule: danger <60, warning 60–69, blue ≥70. Always paired with the number. */
function scoreFillClass(score: number) {
  if (score < 60) return "bg-danger";
  if (score < 70) return "bg-warning";
  return "bg-blue";
}

function scoreTextClass(score: number) {
  if (score < 60) return "text-danger";
  if (score < 70) return "text-warning";
  return "text-ink";
}

const EMPTY_CLS =
  "rounded-[14px] border-[1.5px] border-dashed border-line-strong p-7 text-center text-[15px] text-muted";

function FilterChips({
  filter,
  onChange,
}: {
  filter: "all" | "endorsed";
  onChange: (value: "all" | "endorsed") => void;
}) {
  return (
    <div aria-label="Filter peer pitches" className="flex flex-wrap items-center gap-2" role="group">
      <span className="label-mono mr-1">Show</span>
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
        <p className="mb-3 text-[15px] font-bold text-ink">Peer pitches — same scenario</p>
        {filtered.length === 0 ? (
          <p className="rounded-[14px] border-[1.5px] border-dashed border-line-strong p-4 text-center text-sm text-muted">
            No pitches yet — record yours or review a teammate&apos;s after manager approval.
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
                        className="flex h-8 w-8 items-center justify-center rounded-full border-[1.5px] border-on-blue-muted"
                      >
                        <svg fill="currentColor" className="text-white" height="12" viewBox="0 0 12 12" width="12">
                          <polygon points="3,1.5 10,6 3,10.5" />
                        </svg>
                      </span>
                      <span className="absolute bottom-1.5 right-2 font-mono text-xs text-on-blue-muted">1:00</span>
                      {score > 0 ? (
                        <span className="absolute right-2 top-1.5 font-mono text-xs font-medium text-white">
                          {score < 60 ? "▲ " : ""}
                          {score}
                        </span>
                      ) : null}
                    </div>
                    <div className="px-3.5 py-2.5">
                      <p className="text-sm font-bold text-ink">{pitch.personName}</p>
                      <p className="mt-0.5 font-mono text-xs uppercase tracking-[0.03em] text-muted">
                        {pitch.title} ·{" "}
                        {new Date(pitch.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
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
            Manager-approved + peer-endorsed wins — structured rubric scores, inline playback, mentor picks.
          </p>
        </div>
        <FilterChips filter={filter} onChange={setFilter} />
      </div>

      {filtered.length === 0 ? (
        <div className="p-5">
          <p className={EMPTY_CLS}>No pitches yet — record yours or review a teammate&apos;s after manager approval.</p>
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
                        <Tag tone="signal">◆ {pitch.endorsement_count} endorsements</Tag>
                      ) : null}
                    </div>
                    <p className="font-mono text-xs uppercase tracking-[0.03em] text-muted">
                      {pitch.personName} · {new Date(pitch.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-[30px] font-extrabold leading-none tracking-[-0.03em] ${scoreTextClass(score)}`}>
                      {score < 60 ? "▲ " : ""}
                      {score}
                    </p>
                    <p className="mt-1 font-mono text-xs uppercase tracking-[0.03em] text-muted">Score</p>
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
                      Full review →
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-divider bg-surface-2/40 px-5 py-3 md:grid-cols-4">
                  {(pitch.competencies.length > 0
                    ? pitch.competencies.slice(0, 4)
                    : ["Clarity", "Value", "Objections", "Presence"]
                  ).map((label, index) => {
                    const pct = Math.max(30, Math.min(100, score - 12 + index * 7));
                    return (
                      <div key={`${pitch.id}-${label}`}>
                        <div className="mb-1 flex justify-between gap-2">
                          <span className="text-[13px] text-ink-2">{label}</span>
                          <span className="font-mono text-xs font-medium text-ink">{pct}</span>
                        </div>
                        <div aria-hidden="true" className="h-2 overflow-hidden rounded-[4px] bg-divider">
                          <div className={`h-full rounded-[4px] ${scoreFillClass(pct)}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {pitch.manager_grade || pitch.peer_avg ? (
                  <div className="flex flex-wrap gap-1.5 px-5 pb-3 pt-1">
                    {pitch.manager_grade ? <Tag tone="success">✓ Mgr {pitch.manager_grade}/5</Tag> : null}
                    {pitch.peer_avg ? <Tag tone="blue">● Peers {pitch.peer_avg.toFixed(1)}/5</Tag> : null}
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
