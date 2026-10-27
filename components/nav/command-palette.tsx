"use client";

import { useRouter } from "next/navigation";
import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import type { PaletteEntry } from "@/lib/navigation/nav-model";
import type { SearchGroup } from "@/lib/search/site-search";
import { cn } from "@/lib/utils";

type PaletteItem = { key: string; group: string; label: string; detail?: string; href: string; external?: boolean };

const PAGE_LIMIT = 6;

export function CommandPalette({
  open,
  onClose,
  entries,
}: {
  open: boolean;
  onClose: () => void;
  entries: PaletteEntry[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const listId = useId();

  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [searching, setSearching] = useState(false);

  // Content results come from /api/search, debounced; page results filter locally as before.
  useEffect(() => {
    const q = query.trim();
    if (!open || q.length < 2) {
      setGroups([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    const timer = setTimeout(() => {
      void fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : { groups: [] }))
        .then((body: { groups?: SearchGroup[] }) => {
          setGroups(body.groups ?? []);
          setSearching(false);
        })
        .catch(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, query]);

  const results = useMemo<PaletteItem[]>(() => {
    const q = query.trim().toLowerCase();
    const pages = (q ? entries.filter((entry) => `${entry.section} ${entry.label}`.toLowerCase().includes(q)) : entries).map(
      (entry): PaletteItem => ({ key: `page-${entry.href}-${entry.label}`, group: "Pages", label: entry.label, detail: entry.section, href: entry.href }),
    );
    if (!q) return pages;
    const content = groups.flatMap((group) =>
      group.results.map(
        (result): PaletteItem => ({
          key: `${group.id}-${result.id}`,
          group: group.label,
          label: result.title,
          detail: result.detail,
          href: result.href,
          external: result.external,
        }),
      ),
    );
    return [...pages.slice(0, PAGE_LIMIT), ...content];
  }, [entries, groups, query]);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    setQuery("");
    setIndex(0);
    inputRef.current?.focus();
    return () => restoreRef.current?.focus();
  }, [open]);

  if (!open) return null;

  function go(entry: PaletteItem | undefined) {
    if (!entry) return;
    onClose();
    if (entry.external) window.open(entry.href, "_blank", "noopener,noreferrer");
    else router.push(entry.href);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setIndex((value) => Math.min(value + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setIndex((value) => Math.max(value - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(results[index]);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-scrim px-4 pt-[15vh]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        aria-label="Search"
        aria-modal="true"
        className="w-full max-w-[600px] overflow-hidden rounded-[14px] border border-line bg-white shadow-[var(--shadow-modal)]"
        onKeyDown={onKeyDown}
        role="dialog"
      >
        <input
          aria-activedescendant={results[index] ? `${listId}-${index}` : undefined}
          aria-controls={listId}
          aria-label="Search pages, lessons, practice and people"
          className="w-full border-b border-line px-5 py-4 text-[15px] text-ink outline-none placeholder:text-muted"
          onChange={(event) => {
            setQuery(event.target.value);
            setIndex(0);
          }}
          placeholder="Search lessons, practice, people, or go to a page…"
          ref={inputRef}
          role="combobox"
          aria-expanded="true"
          value={query}
        />
        <ul className="max-h-[420px] overflow-y-auto py-2" id={listId} role="listbox">
          {results.length === 0 ? (
            <li className="px-5 py-3 text-sm text-muted">{searching ? "Searching…" : "Nothing matches that search."}</li>
          ) : (
            results.map((entry, i) => (
              <Fragment key={entry.key}>
                {i === 0 || results[i - 1]!.group !== entry.group ? (
                  <li className="label-caps px-5 pt-3 pb-1" role="presentation">
                    {entry.group}
                  </li>
                ) : null}
                <li
                  aria-selected={i === index}
                  className={cn(
                    "flex cursor-pointer items-baseline justify-between gap-4 px-5 py-2.5 text-[15px]",
                    i === index ? "bg-blue-soft font-bold text-ink" : "text-ink-2",
                  )}
                  id={`${listId}-${i}`}
                  onClick={() => go(entry)}
                  onMouseEnter={() => setIndex(i)}
                  role="option"
                >
                  <span className="min-w-0 truncate">
                    {entry.label}
                    {entry.external ? <span className="sr-only"> (opens in a new tab)</span> : null}
                  </span>
                  {entry.detail ? <span className="shrink-0 truncate text-[13px] text-muted">{entry.detail}</span> : null}
                </li>
              </Fragment>
            ))
          )}
          {searching && results.length > 0 ? (
            <li className="px-5 py-2 text-[13px] text-muted" role="presentation">
              Searching…
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
