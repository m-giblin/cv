"use client";

import { Loader2, Plus, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
 DataTablePagination,
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
 assetType: string;
 projectTags: string[];
 moduleTags: string[];
 updatedAt: string;
};

function parseTags(value: string): string[] {
 return value
 .split(",")
 .map((tag) => tag.trim())
 .filter(Boolean);
}

const CORPUS_COLS = "1fr 100px 160px 90px 60px 80px 120px";

function typeBadge(category: string, assetType: string) {
 const lower = `${category} ${assetType}`.toLowerCase();
 if (lower.includes("battle")) return { bg: "#fee2e2", color: "#dc2626", label: "Battle card" };
 if (lower.includes("playbook") || lower.includes("pitch")) return { bg: "#cffafe", color: "#0e7490", label: "Playbook" };
 if (lower.includes("demo")) return { bg: "#dbeafe", color: "#1d4ed8", label: "Demo guide" };
 if (lower.includes("brief") || lower.includes("one")) return { bg: "#ede9fe", color: "#5b21b6", label: "One-pager" };
 return { bg: "#e8f2fc", color: "#0057a8", label: assetType.replaceAll("_", " ") };
}

const PAGE_SIZE = 20;

const emptyForm = {
 title: "",
 url: "",
 category: "solution_brief",
 assetType: "link" as const,
 projectTags: "",
 moduleTags: "",
};

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
 [asset.title, asset.category, asset.url, asset.assetType, ...asset.projectTags, ...asset.moduleTags]
 .join(" ")
 .toLowerCase()
 .includes(q),
 );
 }, [assets, search]);

 const { rows, page: safePage, pageCount } = paginate(filtered, page, PAGE_SIZE);

 useEffect(() => setPage(1), [search]);

 async function suggestTags() {
 const response = await fetch("/api/corpus/suggest-tags", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ title: form.title, url: form.url, description: form.category }),
 });
 if (!response.ok) {
 toast.error("Could not suggest tags.");
 return;
 }
 const body = (await response.json()) as {
 assetType: typeof form.assetType;
 projectTags: string[];
 moduleTags: string[];
 };
 setForm((current) => ({
 ...current,
 assetType: body.assetType,
 projectTags: body.projectTags.join(", "),
 moduleTags: body.moduleTags.join(", "),
 }));
 toast.success("Tags suggested — review before saving.");
 }

 async function saveAsset(event: React.FormEvent) {
 event.preventDefault();
 setIsSaving(true);

 if (file && !editingId) {
 const formData = new FormData();
 formData.set("title", form.title || file.name);
 formData.set("category", form.category);
 formData.set("assetType", form.assetType);
 formData.set("projectTags", form.projectTags);
 formData.set("moduleTags", form.moduleTags);
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
 body: JSON.stringify({
 title: form.title,
 url: form.url,
 category: form.category,
 assetType: form.assetType,
 projectTags: parseTags(form.projectTags),
 moduleTags: parseTags(form.moduleTags),
 }),
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

 <div className="overflow-hidden border border-[#E2DFD9] bg-white">
 <div
 className="grid border-b border-[#ECEAE6] bg-[#F9F8F6] px-[18px] py-[9px]"
 style={{ gridTemplateColumns: CORPUS_COLS }}
 >
 {["Asset", "Type", "Tags", "Health", "Ver", "Updated", ""].map((header) => (
 <span className="text-[9.5px] font-bold uppercase tracking-[0.07em] text-[#A09D98]" key={header}>
 {header}
 </span>
 ))}
 </div>
 {rows.length === 0 ? (
 <p className="px-4 py-8 text-center text-[#A09D98]">No content yet — add your first asset above.</p>
 ) : (
 rows.map((asset) => {
 const type = typeBadge(asset.category, asset.assetType);
 const tags = [...asset.projectTags, ...asset.moduleTags].join(" · ");
 return (
 <div
 className="grid cursor-pointer items-center border-b border-[#f9fafb] px-[18px] py-[10px] transition hover:bg-[#f7fafd] last:border-b-0"
 key={asset.id}
 style={{ gridTemplateColumns: CORPUS_COLS }}
 >
 <div className="min-w-0">
 <p className="text-[12px] font-semibold text-[#3D3C38]">{asset.title}</p>
 <p className="mt-[1px] truncate text-[10px] text-[#A09D98]">{asset.url}</p>
 </div>
 <span
 className="w-fit font-mono text-[8px] uppercase tracking-[0.08em] px-[8px] py-[2px] text-[9.5px] font-bold"
 style={{ background: type.bg, color: type.color }}
 >
 {type.label}
 </span>
 <span className="truncate text-[11px] text-[#6B6860]">{tags || "—"}</span>
 <span
 className="w-fit rounded-full bg-[#dcfce7] px-[8px] py-[2px] text-[9.5px] font-bold text-[#15803d]"
 >
 Healthy
 </span>
 <span className="text-[11.5px] text-[#3D3C38]">v1</span>
 <span className="text-[11.5px] text-[#A09D98]">{new Date(asset.updatedAt).toLocaleDateString()}</span>
 <div className="flex gap-[6px]">
 <button
 className="inline-flex items-center border border-[#E2DFD9] bg-white px-[10px] py-[5px] text-[11px] font-semibold text-[#3D3C38]"
 onClick={() => copyUrl(asset.url)}
 type="button"
 >
 Copy
 </button>
 <button
 className="inline-flex items-center border border-[#E2DFD9] bg-white px-[10px] py-[5px] text-[11px] font-semibold text-[#3D3C38]"
 onClick={() => {
 setEditingId(asset.id);
 setForm({
 title: asset.title,
 url: asset.url,
 category: asset.category,
 assetType: (asset.assetType as typeof emptyForm.assetType) ?? "link",
 projectTags: asset.projectTags.join(", "),
 moduleTags: asset.moduleTags.join(", "),
 });
 setShowForm(true);
 }}
 type="button"
 >
 Edit
 </button>
 <button
 className="inline-flex items-center bg-[#e8f2fc] px-[10px] py-[5px] text-[11px] font-semibold text-[#0057a8]"
 onClick={() => void suggestTags()}
 type="button"
 >
 AI tag
 </button>
 </div>
 </div>
 );
 })
 )}
 </div>

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
 className="h-10 w-full border border-sp-blue/15 bg-white px-3 text-sm"
 onChange={(e) => setForm((c) => ({ ...c, assetType: e.target.value as typeof form.assetType }))}
 value={form.assetType}
 >
 <option value="link">Link</option>
 <option value="video">Video</option>
 <option value="doc">Document</option>
 <option value="podcast">Podcast</option>
 <option value="file">File</option>
 </select>
 <Input
 onChange={(e) => setForm((c) => ({ ...c, projectTags: e.target.value }))}
 placeholder="Project tags (comma-separated, e.g. ISC, AIS)"
 value={form.projectTags}
 />
 <Input
 onChange={(e) => setForm((c) => ({ ...c, moduleTags: e.target.value }))}
 placeholder="Module tags (comma-separated, e.g. Provisioning)"
 value={form.moduleTags}
 />
 <select
 className="h-10 w-full border border-sp-blue/15 bg-white px-3 text-sm"
 onChange={(e) => setForm((c) => ({ ...c, category: e.target.value }))}
 value={form.category}
 >
 <option value="solution_brief">Solution brief</option>
 <option value="pitch_deck">Pitch deck</option>
 <option value="demo_recording">Demo recording</option>
 <option value="reference">Reference</option>
 </select>
 <div className="flex gap-2">
 <Button onClick={() => void suggestTags()} size="sm" type="button" variant="outline">
 AI suggest tags
 </Button>
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
