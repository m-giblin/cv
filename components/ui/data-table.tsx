"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useId } from "react";
import { Input } from "@/components/ui/input";

export function DataTableToolbar({
  search,
  onSearchChange,
  placeholder,
  total,
  filtered,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder: string;
  total: number;
  filtered: number;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative max-w-md flex-1">
        <label className="sr-only" htmlFor={id}>
          {placeholder}
        </label>
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        />
        <Input
          className="rounded-full pl-10"
          id={id}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={placeholder}
          type="search"
          value={search}
        />
      </div>
      <p className="num text-[13px] text-muted" aria-live="polite">
        {filtered === total ? `${total} ${total === 1 ? "row" : "rows"}` : `${filtered} of ${total} rows`}
      </p>
    </div>
  );
}

export function DataTablePagination({
  page,
  pageCount,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  if (pageCount <= 1) {
    return null;
  }

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between pt-1">
      <p className="num text-[13px] text-muted">
        Page {page} of {pageCount}
      </p>
      <div className="flex gap-2">
        <button
          className="btn-secondary inline-flex items-center gap-1 disabled:border-line disabled:bg-divider disabled:text-muted"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          type="button"
        >
          <ChevronLeft aria-hidden className="h-4 w-4" />
          Previous
        </button>
        <button
          className="btn-secondary inline-flex items-center gap-1 disabled:border-line disabled:bg-divider disabled:text-muted"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          type="button"
        >
          Next
          <ChevronRight aria-hidden className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}

/** Line-card table wrapper. Wide tables scroll inside it and never push the page wider. */
export function DataTableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-white">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;

  return {
    page: safePage,
    pageCount,
    rows: items.slice(start, start + pageSize),
  };
}
