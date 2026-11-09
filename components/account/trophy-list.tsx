"use client";

import { useState } from "react";
import type { CompletionBadge } from "@/lib/account/completion-badges";
import { Stamp } from "@/components/ui/stamp";
import { Tag } from "@/components/ui/tag";

const PAGE_SIZE = 5;

/** "Thu, Oct 9" (plus the year when it isn't this year). */
function formatEarnedDate(iso: string) {
  const date = new Date(iso);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/** Earned trophies, newest first, five to a page so the case can't grow down the page. */
export function TrophyList({ trophies }: { trophies: CompletionBadge[] }) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(trophies.length / PAGE_SIZE));
  const visible = trophies.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <>
      <ul>
        {visible.map((trophy) => (
          <li
            className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 border-b border-divider px-5 py-3.5 last:border-b-0 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
            key={trophy.id}
          >
            <Stamp label={`${trophy.funTitle}: earned`} size={30} state="earned" />
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-ink">{trophy.funTitle}</p>
              <p className="text-sm text-ink-2">{trophy.subtitle}</p>
            </div>
            <div className="col-start-2 flex flex-wrap items-center gap-2 sm:col-start-auto sm:justify-end">
              <Tag tone="blue">{trophy.kind === "challenge" ? "Challenge" : "Simulation"}</Tag>
              <span className="text-[13px] text-muted">{formatEarnedDate(trophy.earnedAt)}</span>
            </div>
          </li>
        ))}
      </ul>
      {pageCount > 1 ? (
        <nav aria-label="Trophy pages" className="flex items-center justify-between gap-3 border-t border-divider px-5 py-3">
          <button className="btn-secondary disabled:opacity-60" disabled={page === 0} onClick={() => setPage(page - 1)} type="button">
            Newer
          </button>
          <span className="num text-[13px] text-muted" role="status">
            Page {page + 1} of {pageCount}
          </span>
          <button className="btn-secondary disabled:opacity-60" disabled={page >= pageCount - 1} onClick={() => setPage(page + 1)} type="button">
            Older
          </button>
        </nav>
      ) : null}
    </>
  );
}
