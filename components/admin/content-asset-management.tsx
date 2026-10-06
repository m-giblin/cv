"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AdminTable,
  EmptyState,
  Field,
  LinkButton,
  LoadingState,
  Meta,
  SecondaryButton,
  SelectInput,
  Td,
  TextInput,
  Th,
} from "@/components/admin/admin-ui";
import { Chip } from "@/components/ui/chip";
import { Drawer } from "@/components/ui/drawer";
import { rowHighlight, TwoLineCell } from "@/components/ui/table";
import { Tag } from "@/components/ui/tag";
import { cn } from "@/lib/utils";

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

type AssetType = "link" | "video" | "doc" | "podcast" | "file";

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function humanize(value: string) {
  const text = value.replaceAll("_", " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "—";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const options: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" };
  if (date.getFullYear() !== new Date().getFullYear()) options.year = "numeric";
  return date.toLocaleDateString("en-US", options);
}

function paginate<T>(items: T[], page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;
  return { page: safePage, pageCount, rows: items.slice(start, start + pageSize) };
}

const PAGE_SIZE = 20;

const emptyForm = {
  title: "",
  url: "",
  category: "solution_brief",
  assetType: "link" as AssetType,
  projectTags: "",
  moduleTags: "",
};

export function ContentAssetManagement() {
  const formId = useId();
  const [assets, setAssets] = useState<ContentAsset[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
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

  const assetTypes = useMemo(
    () => [...new Set(assets.map((asset) => asset.assetType).filter(Boolean))].sort(),
    [assets],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter((asset) => {
      if (typeFilter && asset.assetType !== typeFilter) return false;
      if (!q) return true;
      return [asset.title, asset.category, asset.url, asset.assetType, ...asset.projectTags, ...asset.moduleTags]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [assets, search, typeFilter]);

  const { rows, page: safePage, pageCount } = paginate(filtered, page, PAGE_SIZE);

  useEffect(() => setPage(1), [search, typeFilter]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFile(null);
    setShowForm(true);
  }

  function openEdit(asset: ContentAsset) {
    setEditingId(asset.id);
    setForm({
      title: asset.title,
      url: asset.url,
      category: asset.category,
      assetType: (asset.assetType as AssetType) ?? "link",
      projectTags: asset.projectTags.join(", "),
      moduleTags: asset.moduleTags.join(", "),
    });
    setShowForm(true);
  }

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
      assetType: AssetType;
      projectTags: string[];
      moduleTags: string[];
    };
    setForm((current) => ({
      ...current,
      assetType: body.assetType,
      projectTags: body.projectTags.join(", "),
      moduleTags: body.moduleTags.join(", "),
    }));
    toast.success("Tags suggested. Review before saving.");
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-2xl text-sm text-muted">
          Assets appear in plan steps and on the SE Resources page. Managers pick them when building onboarding plans.
        </p>
        <button className="btn-primary" onClick={openCreate} type="button">
          Add content
        </button>
      </div>

      {isLoading ? (
        <LoadingState label="Loading content…" />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <TextInput
              aria-label="Search content"
              className="max-w-sm"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, category, URL or tags"
              type="search"
              value={search}
            />
            <span className="text-sm text-muted">
              Showing {filtered.length} of {assets.length}
            </span>
          </div>

          {assetTypes.length > 1 ? (
            <div aria-label="Filter by type" className="flex flex-wrap gap-2" role="group">
              <Chip active={typeFilter === null} count={assets.length} onClick={() => setTypeFilter(null)}>
                All
              </Chip>
              {assetTypes.map((type) => (
                <Chip
                  active={typeFilter === type}
                  count={assets.filter((asset) => asset.assetType === type).length}
                  key={type}
                  onClick={() => setTypeFilter(type)}
                >
                  {humanize(type)}
                </Chip>
              ))}
            </div>
          ) : null}

          <AdminTable caption="Content library">
            <thead>
              <tr>
                <Th>Title</Th>
                <Th>Type</Th>
                <Th>Category</Th>
                <Th>Updated</Th>
                <Th className="text-right">
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState>
                      {assets.length === 0 ? "No content yet. Add your first asset." : "No content matches your filters."}
                    </EmptyState>
                  </td>
                </tr>
              ) : (
                rows.map((asset) => {
                  const tags = [...asset.projectTags, ...asset.moduleTags].join(", ");
                  return (
                    <tr className={cn(showForm && editingId === asset.id && rowHighlight.selected)} key={asset.id}>
                      <Td className="max-w-[420px]">
                        <span title={asset.url}>
                          <TwoLineCell subline={asset.url} title={asset.title} />
                        </span>
                        {tags ? <p className="mt-0.5 truncate text-[13px] text-ink-2">Tags: {tags}</p> : null}
                      </Td>
                      <Td>
                        <Tag tone="blue">{humanize(asset.assetType)}</Tag>
                      </Td>
                      <Td className="text-ink-2">{humanize(asset.category)}</Td>
                      <Td>
                        <Meta>{formatDate(asset.updatedAt)}</Meta>
                      </Td>
                      <Td className="text-right whitespace-nowrap">
                        <div className="inline-flex gap-4">
                          <LinkButton onClick={() => copyUrl(asset.url)}>Copy link</LinkButton>
                          <LinkButton onClick={() => openEdit(asset)}>Edit</LinkButton>
                          <LinkButton onClick={() => void removeAsset(asset)} tone="danger">
                            Delete
                          </LinkButton>
                        </div>
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </AdminTable>

          {pageCount > 1 ? (
            <div className="flex items-center justify-end gap-3">
              <span className="text-sm text-muted">
                Page {safePage} of {pageCount}
              </span>
              <SecondaryButton disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                Previous
              </SecondaryButton>
              <SecondaryButton disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)}>
                Next
              </SecondaryButton>
            </div>
          ) : null}
        </div>
      )}

      <Drawer
        size="form"
        footer={
          <>
            <button className="btn-primary" disabled={isSaving} form={formId} type="submit">
              {isSaving ? "Saving…" : "Save"}
            </button>
            <SecondaryButton onClick={() => setShowForm(false)}>Cancel</SecondaryButton>
          </>
        }
        onClose={() => setShowForm(false)}
        open={showForm}
        title={editingId ? "Edit content" : "Add content"}
      >
        <form className="flex flex-col gap-4" id={formId} onSubmit={(event) => void saveAsset(event)}>
          <p className="text-sm text-muted">Paste a URL or upload a file to the content bucket.</p>
          <Field htmlFor={`${formId}-title`} label="Title">
            <TextInput
              id={`${formId}-title`}
              onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
              required
              value={form.title}
            />
          </Field>
          <Field htmlFor={`${formId}-url`} label="URL">
            <TextInput
              id={`${formId}-url`}
              onChange={(e) => setForm((c) => ({ ...c, url: e.target.value }))}
              placeholder="https://"
              required={!file || Boolean(editingId)}
              type="url"
              value={form.url}
            />
          </Field>
          {!editingId ? (
            <Field hint="Optional. If chosen, the file is uploaded and used instead of the URL." htmlFor={`${formId}-file`} label="Upload file">
              <input
                accept=".pdf,.ppt,.pptx,.doc,.docx,.mp4,.mov"
                className="text-sm text-ink-2 file:mr-3 file:rounded-full file:border file:border-line-strong file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-ink"
                id={`${formId}-file`}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                type="file"
              />
            </Field>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field htmlFor={`${formId}-type`} label="Type">
              <SelectInput
                id={`${formId}-type`}
                onChange={(e) => setForm((c) => ({ ...c, assetType: e.target.value as AssetType }))}
                value={form.assetType}
              >
                <option value="link">Link</option>
                <option value="video">Video</option>
                <option value="doc">Document</option>
                <option value="podcast">Podcast</option>
                <option value="file">File</option>
              </SelectInput>
            </Field>
            <Field htmlFor={`${formId}-category`} label="Category">
              <SelectInput
                id={`${formId}-category`}
                onChange={(e) => setForm((c) => ({ ...c, category: e.target.value }))}
                value={form.category}
              >
                <option value="solution_brief">Solution brief</option>
                <option value="pitch_deck">Pitch deck</option>
                <option value="demo_recording">Demo recording</option>
                <option value="reference">Reference</option>
                {["solution_brief", "pitch_deck", "demo_recording", "reference"].includes(form.category) ? null : (
                  <option value={form.category}>{humanize(form.category)}</option>
                )}
              </SelectInput>
            </Field>
          </div>
          <Field hint="Comma-separated, e.g. ISC, AIS." htmlFor={`${formId}-project-tags`} label="Project tags">
            <TextInput
              id={`${formId}-project-tags`}
              onChange={(e) => setForm((c) => ({ ...c, projectTags: e.target.value }))}
              value={form.projectTags}
            />
          </Field>
          <Field hint="Comma-separated, e.g. Provisioning." htmlFor={`${formId}-module-tags`} label="Module tags">
            <TextInput
              id={`${formId}-module-tags`}
              onChange={(e) => setForm((c) => ({ ...c, moduleTags: e.target.value }))}
              value={form.moduleTags}
            />
          </Field>
          <div>
            <SecondaryButton onClick={() => void suggestTags()}>Suggest tags with AI</SecondaryButton>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
