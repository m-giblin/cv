"use client";

import { Search } from "lucide-react";
import { useEffect, useId, useState } from "react";

type SearchResult = {
  type: "tenant" | "ticket" | "profile";
  id: string;
  label: string;
  sublabel?: string;
};

export function PlatformGlobalSearch({
  onSelectTenant,
  onSelectTicket,
}: {
  onSelectTenant: (tenantId: string) => void;
  onSelectTicket: (ticketId: string) => void;
}) {
  const inputId = useId();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const handle = setTimeout(() => {
      setLoading(true);
      void fetch(`/api/platform/search?q=${encodeURIComponent(query.trim())}`)
        .then((res) => res.json())
        .then((body: { results: SearchResult[] }) => setResults(body.results ?? []))
        .finally(() => setLoading(false));
    }, 250);

    return () => clearTimeout(handle);
  }, [query]);

  const open = query.length >= 2;

  return (
    <div className="relative w-full sm:w-[280px]">
      <label className="sr-only" htmlFor={inputId}>
        Search tenants, tickets and users
      </label>
      <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        aria-controls={open ? listId : undefined}
        aria-expanded={open}
        className="h-10 w-full rounded-full border border-line-strong bg-white py-2 pl-10 pr-4 text-sm text-ink placeholder:text-muted focus:border-blue"
        id={inputId}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setQuery("");
        }}
        placeholder="Search tenants, tickets, users"
        role="combobox"
        type="search"
        value={query}
      />
      {open ? (
        <div
          className="absolute right-0 z-30 mt-1.5 w-full min-w-[280px] overflow-hidden rounded-[14px] border border-line bg-white"
          id={listId}
          role="listbox"
        >
          {loading ? (
            <p className="px-4 py-3 text-sm text-muted" role="status">
              Searching…
            </p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">No results.</p>
          ) : (
            results.map((result) => (
              <button
                aria-selected={false}
                className="flex w-full flex-col gap-0.5 border-b border-divider px-4 py-2.5 text-left last:border-b-0 hover:bg-blue-soft"
                key={`${result.type}-${result.id}`}
                onClick={() => {
                  if (result.type === "tenant") onSelectTenant(result.id);
                  if (result.type === "ticket") onSelectTicket(result.id);
                  setQuery("");
                  setResults([]);
                }}
                role="option"
                type="button"
              >
                <span className="text-sm font-semibold text-ink">{result.label}</span>
                <span className="text-[13px] text-muted">
                  {result.type.charAt(0).toUpperCase() + result.type.slice(1)}
                  {result.sublabel ? `, ${result.sublabel}` : ""}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
