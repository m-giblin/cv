"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { PaletteEntry } from "@/lib/navigation/nav-model";
import { cn } from "@/lib/utils";

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

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((entry) => `${entry.section} ${entry.label}`.toLowerCase().includes(q));
  }, [entries, query]);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    setQuery("");
    setIndex(0);
    inputRef.current?.focus();
    return () => restoreRef.current?.focus();
  }, [open]);

  if (!open) return null;

  function go(entry: PaletteEntry | undefined) {
    if (!entry) return;
    onClose();
    router.push(entry.href);
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
        aria-label="Go to"
        aria-modal="true"
        className="w-full max-w-[520px] overflow-hidden rounded-[14px] border border-line bg-white shadow-[var(--shadow-modal)]"
        onKeyDown={onKeyDown}
        role="dialog"
      >
        <input
          aria-activedescendant={results[index] ? `${listId}-${index}` : undefined}
          aria-controls={listId}
          aria-label="Search pages"
          className="w-full border-b border-line px-5 py-4 text-[15px] text-ink outline-none placeholder:text-muted"
          onChange={(event) => {
            setQuery(event.target.value);
            setIndex(0);
          }}
          placeholder="Go to…"
          ref={inputRef}
          role="combobox"
          aria-expanded="true"
          value={query}
        />
        <ul className="max-h-[320px] overflow-y-auto py-2" id={listId} role="listbox">
          {results.length === 0 ? (
            <li className="px-5 py-3 text-sm text-muted">No matching pages.</li>
          ) : (
            results.map((entry, i) => (
              <li
                aria-selected={i === index}
                className={cn(
                  "flex cursor-pointer items-baseline justify-between gap-4 px-5 py-2.5 text-[15px]",
                  i === index ? "bg-blue-soft font-bold text-ink" : "text-ink-2",
                )}
                id={`${listId}-${i}`}
                key={`${entry.href}-${entry.label}`}
                onClick={() => go(entry)}
                onMouseEnter={() => setIndex(i)}
                role="option"
              >
                <span>{entry.label}</span>
                {entry.section ? <span className="text-[13px] text-muted">{entry.section}</span> : null}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
