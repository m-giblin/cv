"use client";

import { Copy, Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DataTablePagination,
  DataTableShell,
  DataTableToolbar,
  paginate,
} from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";

type ContentAsset = {
  id: string;
  title: string;
  category: string;
  url: string;
  contentType: string | null;
  updatedAt: string;
};

const PAGE_SIZE = 20;

const emptyForm = { title: "", url: "", category: "solution_brief" };

export function ContentAssetManagement() {
  const [assets, setAssets] = useState<ContentAsset[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    const response = await fetch("/api/admin/content-assets");
    if (!response.ok) {
      toast.error("Failed to load content.");
      setIsLoading(false);
      return;
    }
    const body = (await response.json()) as { assets: ContentAsset[] };
    setAssets(body.assets);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter((asset) =>
      [asset.title, asset.category, asset.url].join(" ").toLowerCase().includes(q),
    );
  }, [assets, search]);

  const { rows, page: safePage, pageCount } = paginate(filtered, page, PAGE_SIZE);

  useEffect(() => setPage(1), [search]);

  async function saveAsset(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);

    if (file && !editingId) {
      const formData = new FormData();
      formData.set("title", form.title || file.name);
      formData.set("category", form.category);
      formData.set("file", file);
      const response = await fetch("/api/admin/content-assets/upload", { method: "POST", body: formData });
      if (!response.ok) {
        toast.error("Upload failed.");
        setIsSaving(false);
        return;
      }
    } else {
      const endpoint = editingId ? `/api/admin/content-assets/${editingId}` : "/api/admin/content-assets";
      const response = await fetch(endpoint, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title, url: form.url, category: form.category }),
      });
      if (!response.ok) {
        toast.error("Save failed.");
        setIsSaving(false);
        return;
      }
    }

    toast.success(editingId ? "Content updated." : "Content saved.");
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setFile(null);
    await load();
    setIsSaving(false);
  }

  async function removeAsset(asset: ContentAsset) {
    if (!confirm(`Delete "${asset.title}"?`)) return;
    const response = await fetch(`/api/admin/content-assets/${asset.id}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("Delete failed.");
      return;
    }
    toast.success("Deleted.");
    await load();
  }

  function copyUrl(url: string) {
    void navigator.clipboard.writeText(url);
    toast.success("Link copied.");
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-sp-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-lg font-bold text-sp-navy">Content library</h2>
          <p className="text-sm text-sp-navy-muted">
            Assets appear in plan steps and on the SE Resources page. Managers pick them when building onboarding plans.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingId(null);
            setForm(emptyForm);
            setShowForm(true);
          }}
          size="sm"
        >
          <Plus className="h-4 w-4" />
          Add content
        </Button>
      </div>

      <DataTableToolbar
        filtered={filtered.length}
        onSearchChange={setSearch}
        placeholder="Search title, category, URL…"
        search={search}
        total={assets.length}
      />

      <DataTableShell>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-sp-blue/10 bg-sp-blue-soft/30 text-xs uppercase tracking-wide text-sp-navy-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Title</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Updated</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-sp-navy-muted" colSpan={5}>
                  No content yet — add your first asset above.
                </td>
              </tr>
            ) : (
              rows.map((asset) => (
                <tr className="border-b border-sp-blue/5 hover:bg-sp-blue-soft/20" key={asset.id}>
                  <td className="px-4 py-3 font-semibold text-sp-navy">{asset.title}</td>
                  <td className="px-4 py-3">
                    <Badge tone="blue">{asset.category.replaceAll("_", " ")}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sp-navy-muted">{asset.contentType ?? "link"}</td>
                  <td className="px-4 py-3 text-xs text-sp-navy-muted">
                    {new Date(asset.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button aria-label="Copy link" onClick={() => copyUrl(asset.url)} size="sm" variant="ghost">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        aria-label="Edit"
                        onClick={() => {
                          setEditingId(asset.id);
                          setForm({ title: asset.title, url: asset.url, category: asset.category });
                          setShowForm(true);
                        }}
                        size="sm"
                        variant="ghost"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button aria-label="Delete" onClick={() => void removeAsset(asset)} size="sm" variant="ghost">
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </DataTableShell>

      <DataTablePagination onPageChange={setPage} page={safePage} pageCount={pageCount} />

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit content" : "Add content"}</CardTitle>
            <CardDescription>Paste a URL or upload a file to the content bucket.</CardDescription>
          </CardHeader>
          <form className="space-y-3" onSubmit={saveAsset}>
            <Input
              onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
              placeholder="Title"
              required
              value={form.title}
            />
            <Input
              onChange={(e) => setForm((c) => ({ ...c, url: e.target.value }))}
              placeholder="URL"
              required={!file || Boolean(editingId)}
              type="url"
              value={form.url}
            />
            {!editingId ? (
              <label className="flex items-center gap-2 text-sm text-sp-navy-muted">
                <Upload className="h-4 w-4" />
                Upload file (optional)
                <input
                  accept=".pdf,.ppt,.pptx,.doc,.docx,.mp4,.mov"
                  className="text-xs"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  type="file"
                />
              </label>
            ) : null}
            <select
              className="h-10 w-full rounded-xl border border-sp-blue/15 bg-white px-3 text-sm"
              onChange={(e) => setForm((c) => ({ ...c, category: e.target.value }))}
              value={form.category}
            >
              <option value="solution_brief">Solution brief</option>
              <option value="pitch_deck">Pitch deck</option>
              <option value="demo_recording">Demo recording</option>
              <option value="reference">Reference</option>
            </select>
            <div className="flex gap-2">
              <Button disabled={isSaving} type="submit">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
              <Button onClick={() => setShowForm(false)} type="button" variant="outline">
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
