"use client";

import { useState } from "react";
import type { StepEvidence } from "@/lib/mentoring/mentor-records-model";

const CARD_CLS = "flex flex-col gap-3 rounded-[14px] border border-line bg-white p-[18px]";

function shortDate(iso: string | undefined) {
  if (!iso) return null;
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Transcript({ lines }: { lines: { speaker: string; message: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <button className="link self-start text-sm" onClick={() => setOpen(!open)} type="button">
        {open ? "Hide the conversation" : `Read the conversation (${lines.length} turns)`}
      </button>
      {open ? (
        <ol className="m-0 flex max-h-[420px] list-none flex-col gap-2 overflow-y-auto rounded-[10px] bg-bg p-3 pl-3">
          {lines.map((line, index) => (
            <li className="text-[15px]" key={`${index}-${line.speaker}`}>
              <span className="font-bold text-ink">{line.speaker}: </span>
              <span className="text-ink-2">{line.message}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

/** What the mentee produced for a step: scores, write-ups, transcripts. */
export function StepEvidenceView({ evidence, firstName }: { evidence: StepEvidence[]; firstName: string }) {
  if (evidence.length === 0) {
    return (
      <section className={CARD_CLS}>
        <h3 className="text-lg font-extrabold text-ink">What {firstName} did</h3>
        <p className="text-[15px] text-muted">Nothing yet. Their work shows up here as soon as they start.</p>
      </section>
    );
  }
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-lg font-extrabold text-ink">What {firstName} did</h3>
      {evidence.map((item, index) => (
        <article className={CARD_CLS} key={`${item.label}-${index}`}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="label-caps">{item.label}</span>
            {item.at ? <span className="text-[13px] text-muted">{shortDate(item.at)}</span> : null}
          </div>
          {item.facts.length ? (
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[15px]">
              {item.facts.map((fact) => (
                <div className="contents" key={fact.label}>
                  <dt className="text-muted">{fact.label}</dt>
                  <dd className="m-0 font-bold text-ink">{fact.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {item.lists.map((list) => (
            <div className="flex flex-col gap-1" key={list.label}>
              <p className="text-sm font-bold text-ink">{list.label}</p>
              <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-[15px] text-ink-2">
                {list.items.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            </div>
          ))}
          {item.texts.map((entry) => (
            <div className="flex flex-col gap-1" key={entry.label}>
              <p className="text-sm font-bold text-ink">{entry.label}</p>
              <p className="whitespace-pre-wrap rounded-[10px] bg-bg p-3 text-[15px] text-ink-2">{entry.body}</p>
            </div>
          ))}
          {item.transcript ? <Transcript lines={item.transcript} /> : null}
        </article>
      ))}
    </section>
  );
}
