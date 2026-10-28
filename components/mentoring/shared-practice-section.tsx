"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import type { SharedDetail, SharedItem } from "@/lib/mentoring/shared-practice";
import { splitCoachMessage } from "@/lib/simulations/coach-message";

const shortDate = (at: string) => new Date(at).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** Free practice the mentee chose to share: a list in the mentee workbench, each opening in full. */
export function SharedPracticeSection({ assignmentId, firstName, initialRef }: { assignmentId: string; firstName: string; initialRef?: string }) {
  const [items, setItems] = useState<SharedItem[] | null>(null);
  const [openRef, setOpenRef] = useState<string | null>(initialRef ?? null);
  useEffect(() => {
    void fetch(`/api/mentoring/shared?assignment=${assignmentId}`)
      .then((response) => response.json())
      .then((body: { items?: SharedItem[] }) => setItems(body.items ?? []))
      .catch(() => setItems([]));
  }, [assignmentId]);

  if (!items?.length) return null;
  return (
    <section className="space-y-2">
      <h4 className="text-lg font-extrabold text-ink">Shared with you</h4>
      <p className="m-0 text-sm text-muted">Free practice {firstName} chose to send you. It doesn&apos;t count toward the plan.</p>
      <ul className="overflow-hidden rounded-[14px] border border-line bg-white">
        {items.map((item) => (
          <li className="border-b border-divider last:border-b-0" key={item.ref}>
            <button
              className="flex w-full items-start justify-between gap-3 px-4 py-2.5 text-left text-[15px] hover:bg-blue-soft focus-visible:bg-blue-soft"
              onClick={() => setOpenRef(item.ref)}
              type="button"
            >
              <span className="flex min-w-0 flex-col">
                <span className="font-bold text-ink-2">{item.title}</span>
                <span className="text-[13px] text-muted">{item.kind === "simulation" ? "Simulation" : "Pitch"}</span>
              </span>
              <span className="shrink-0 text-[13px] text-muted">
                {item.score !== null ? `AI score ${item.score} · ` : ""}
                {shortDate(item.sharedAt)}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {openRef ? <SharedItemWorkbench assignmentId={assignmentId} itemRef={openRef} onClose={() => setOpenRef(null)} /> : null}
    </section>
  );
}

function SharedItemWorkbench({ assignmentId, itemRef, onClose }: { assignmentId: string; itemRef: string; onClose: () => void }) {
  const [detail, setDetail] = useState<SharedDetail | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void fetch(`/api/mentoring/shared?assignment=${assignmentId}&item=${encodeURIComponent(itemRef)}`)
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as { detail?: SharedDetail; error?: string } | null;
        if (!response.ok || !body?.detail) throw new Error(body?.error ?? "Couldn't load it.");
        setDetail(body.detail);
      })
      .catch((caught: Error) => setError(caught.message));
  }, [assignmentId, itemRef]);

  return (
    <Drawer
      eyebrow={detail ? `Shared ${detail.kind} · ${shortDate(detail.sharedAt)}` : "Shared practice"}
      onClose={onClose}
      open
      size="form"
      subtitle={detail?.kind === "simulation" && detail.persona ? `With ${detail.persona.replace(/\s*\(.*\)$/, "")}` : undefined}
      title={detail ? `${detail.title}${detail.score !== null ? ` · ${detail.score}` : ""}` : "Loading"}
    >
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {!detail && !error ? <p className="text-sm text-muted">Loading</p> : null}
      {detail?.kind === "simulation" ? (
        <div className="flex flex-col gap-4 text-sm">
          {detail.summary ? <p className="m-0 text-ink">{detail.summary}</p> : null}
          <dl className="m-0 grid gap-2">
            {detail.strengths[0] ? <Line label="Strength" text={detail.strengths[0]} /> : null}
            {detail.gaps[0] ? <Line label="Improve" text={detail.gaps[0]} /> : null}
            {detail.nextPractice ? <Line label="Next practice" text={detail.nextPractice} /> : null}
            {detail.reflection ? <Line label="Their reflection" text={detail.reflection} /> : null}
          </dl>
          {detail.transcript.length ? (
            <div>
              <p className="label-caps mb-2">The conversation</p>
              <ol className="m-0 flex list-none flex-col gap-2 p-0">
                {detail.transcript.map((entry, index) =>
                  entry.speaker === "se" ? (
                    <li key={index}>
                      <span className="font-semibold text-blue">They said: </span>
                      <span className="text-ink">{entry.message}</span>
                    </li>
                  ) : (
                    <li key={index}>
                      <span className="font-semibold text-ink-2">Buyer: </span>
                      <span className="text-ink-2">{splitCoachMessage(entry.message).reply}</span>
                    </li>
                  ),
                )}
              </ol>
            </div>
          ) : null}
        </div>
      ) : null}
      {detail?.kind === "pitch" ? (
        <div className="flex flex-col gap-3 text-sm">
          {detail.scores.length ? <p className="m-0 text-muted">{detail.scores.map((row) => `${row.label} ${row.score}`).join(" · ")}</p> : null}
          {detail.pitch ? <p className="m-0 text-ink">“{detail.pitch}”</p> : <p className="m-0 text-muted">Recorded on {detail.mode}; no transcript was kept.</p>}
          {detail.reflection ? <Line label="Their reflection" text={detail.reflection} /> : null}
        </div>
      ) : null}
    </Drawer>
  );
}

function Line({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <dt className="text-[13px] font-semibold text-ink">{label}</dt>
      <dd className="m-0 text-ink-2">{text}</dd>
    </div>
  );
}
