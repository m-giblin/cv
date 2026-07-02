"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DataTablePagination,
  DataTableShell,
  DataTableToolbar,
  paginate,
} from "@/components/ui/data-table";

type ContentAsset = {
  id: string;
  title: string;
  category: string;
  url: string;
  contentType: string | null;
};

const PAGE_SIZE = 15;

export function ContentLibraryBrowser() {
  const [assets, setAssets] = useState<ContentAsset[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (category) params.set("category", category);
    const response = await fetch(`/api/content?${params.toString()}`);
    if (response.ok) {
      const body = (await response.json()) as { assets: ContentAsset[] };
      setAssets(body.assets);
    }
    setIsLoading(false);
  }, [category, search]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 200);
    return () => clearTimeout(timer);
  }, [load]);

  const { rows, page: safePage, pageCount } = paginate(assets, page, PAGE_SIZE);

  useEffect(() => setPage(1), [search, category]);

  const categories = useMemo(
    () => [...new Set(assets.map((asset) => asset.category))].sort(),
    [assets],
  );

  if (isLoading && assets.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-sp-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <DataTableToolbar
            filtered={assets.length}
            onSearchChange={setSearch}
            placeholder="Search resources…"
            search={search}
            total={assets.length}
          />
        </div>
        <select
          className="h-10 rounded-xl border border-sp-blue/15 bg-white px-3 text-sm"
          onChange={(e) => setCategory(e.target.value)}
          value={category}
        >
          <option value="">All categories</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>

      <DataTableShell>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-sp-blue/10 bg-sp-blue-soft/30 text-xs uppercase tracking-wide text-sp-navy-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Title</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Open</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-sp-navy-muted" colSpan={3}>
                  No resources match your search.
                </td>
              </tr>
            ) : (
              rows.map((asset) => (
                <tr className="border-b border-sp-blue/5" key={asset.id}>
                  <td className="px-4 py-3 font-semibold text-sp-navy">{asset.title}</td>
                  <td className="px-4 py-3">
                    <Badge tone="blue">{asset.category.replaceAll("_", " ")}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      className="inline-flex items-center gap-1 font-semibold text-sp-blue hover:text-sp-blue-deep"
                      href={asset.url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </DataTableShell>

      <DataTablePagination onPageChange={setPage} page={safePage} pageCount={pageCount} />
    </div>
  );
}
