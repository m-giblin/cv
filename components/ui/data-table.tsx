"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sp-navy-muted/60" />
        <Input
          className="pl-9"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={placeholder}
          value={search}
        />
      </div>
      <p className="text-sm text-sp-navy-muted">
        {filtered === total ? `${total} rows` : `${filtered} of ${total} rows`}
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
    <div className="flex items-center justify-between border-t border-sp-blue/10 pt-3">
      <p className="text-sm text-sp-navy-muted">
        Page {page} of {pageCount}
      </p>
      <div className="flex gap-2">
        <Button disabled={page <= 1} onClick={() => onPageChange(page - 1)} size="sm" type="button" variant="outline">
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          size="sm"
          type="button"
          variant="outline"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function DataTableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-sp-blue/10 bg-white shadow-sm">
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
