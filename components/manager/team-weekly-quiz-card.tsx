"use client";

import { useEffect, useState } from "react";
import type { WeeklyQuizRow } from "@/app/api/manager/weekly-quiz/route";
import { MIX_PASS_MARK } from "@/lib/question-bank/model";

/**
 * Manager Today: who has passed this week's quiz, and who still needs to. Each name opens that
 * person's workbench.
 */
export function TeamWeeklyQuizCard({ onOpenProfile }: { onOpenProfile: (profileId: string) => void }) {
  const [rows, setRows] = useState<WeeklyQuizRow[] | null>(null);
  useEffect(() => {
    void fetch("/api/manager/weekly-quiz")
      .then((response) => (response.ok ? response.json() : { rows: [] }))
      .then((body: { rows?: WeeklyQuizRow[] }) => setRows(body.rows ?? []))
      .catch(() => setRows([]));
  }, []);

  if (!rows?.length) return null;
  const passed = rows.filter((row) => row.status === "passed").length;
  // Below the mark first (they tried), then those who haven't started.
  const open = rows.filter((row) => row.status !== "passed").sort((a, b) => (a.status === b.status ? 0 : a.status === "below" ? -1 : 1));

  return (
    <section aria-labelledby="team-weekly-quiz" className="flex flex-col gap-3 rounded-[14px] border border-line bg-white px-[22px] py-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="label-caps m-0" id="team-weekly-quiz">
          Weekly quiz
        </h2>
        <span className="text-sm text-muted">
          <span className="num font-extrabold text-ink">{passed}</span> of {rows.length} passed
        </span>
      </div>
      <div aria-hidden className="flex gap-1">
        {rows.map((row) => (
          <span
            className={`h-2 flex-1 rounded-[2px] ${row.status === "passed" ? "bg-success" : row.status === "below" ? "bg-warning" : "bg-line"}`}
            key={row.id}
          />
        ))}
      </div>
      {open.length ? (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {open.map((row) => (
            <li className="flex items-baseline justify-between gap-3 text-sm" key={row.id}>
              <button className="link truncate text-left" onClick={() => onOpenProfile(row.id)} type="button">
                {row.name}
              </button>
              <span className={row.status === "below" ? "shrink-0 font-bold text-warning" : "shrink-0 text-muted"}>
                {row.status === "below" ? `Best ${row.best}%, needs ${MIX_PASS_MARK}%` : "Not taken"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-sm text-ink-2">Everyone has passed this week.</p>
      )}
    </section>
  );
}
