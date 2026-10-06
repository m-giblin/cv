"use client";

import { ChevronRight, FileUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { PlaybookEditor } from "@/components/playbooks/playbook-editor";
import { PlaybookView } from "@/components/playbooks/playbook-view";
import { Drawer } from "@/components/ui/drawer";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { StatusPill } from "@/components/ui/status-pill";
import type { CapabilityPlaybook, PlaybookBody, PlaybookGuide } from "@/lib/playbooks/types";

type ImportResult = { chapters: number; warnings: string[] } | { error: string };

/** Content › Playbooks: import a field guide, review each chapter, publish to Learn. */
export function PlaybookAdmin({ guides, playbooks: initial }: { guides: PlaybookGuide[]; playbooks: CapabilityPlaybook[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [playbooks, setPlaybooks] = useState(initial);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busyGuide, setBusyGuide] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  // Server refreshes hand down new props; keep local edits in sync with them.
  const [seen, setSeen] = useState(initial);
  if (seen !== initial) {
    setSeen(initial);
    setPlaybooks(initial);
  }

  const open = playbooks.find((playbook) => playbook.id === openId) ?? null;

  async function importGuide() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setResult({ error: "Choose a .docx file first." });
      return;
    }
    setImporting(true);
    setResult(null);
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/admin/playbooks/import", { method: "POST", body: form }).catch(() => null);
    const body = (await response?.json().catch(() => null)) as (ImportResult & { error?: string }) | null;
    setImporting(false);
    if (!response?.ok || !body || "error" in body) {
      setResult({ error: body?.error ?? "The import didn't finish. Try again." });
      return;
    }
    setResult(body);
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  }

  async function guideAction(guide: PlaybookGuide, action: "publish" | "unpublish" | "delete") {
    if (action === "delete" && !window.confirm(`Delete "${guide.title}" and all its playbooks? This can't be undone.`)) return;
    setBusyGuide(guide.id);
    const response = await fetch(`/api/admin/playbooks/guides/${guide.id}`, {
      method: action === "delete" ? "DELETE" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: action === "delete" ? undefined : JSON.stringify({ publishAll: action === "publish" }),
    }).catch(() => null);
    setBusyGuide(null);
    if (!response?.ok) {
      window.alert("That didn't save. Try again.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3 rounded-[14px] border border-line-strong bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="m-0 text-[18px] font-extrabold text-ink">Import a field guide</h2>
        <p className="m-0 text-[14px] text-ink-2">
          Upload the Word (.docx) guide. Each chapter becomes a draft playbook you can check and edit before publishing to
          Learn. Importing again creates a new copy, so you can compare editions before deleting the old one.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="sr-only" htmlFor="playbook-file">
            Field guide file
          </label>
          <input
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="text-[14px] text-ink file:mr-3 file:rounded-full file:border file:border-line-strong file:bg-white file:px-4 file:py-2 file:font-bold file:text-ink"
            id="playbook-file"
            ref={fileRef}
            type="file"
          />
          <button className="btn-primary" disabled={importing} onClick={() => void importGuide()} type="button">
            <FileUp aria-hidden className="h-4 w-4" />
            {importing ? "Importing…" : "Import guide"}
          </button>
        </div>
        {result && "error" in result ? (
          <p className="m-0 rounded-[10px] bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
            {result.error}
          </p>
        ) : null}
        {result && !("error" in result) ? (
          <div className="flex flex-col gap-1.5 rounded-[10px] bg-blue-soft px-4 py-3 text-sm text-ink" role="status">
            <span className="font-bold">Imported {result.chapters} playbooks as drafts. Review them below, then publish.</span>
            {result.warnings.length ? (
              <>
                <span>Check these before publishing:</span>
                <ul className="m-0 list-disc pl-5">
                  {result.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        ) : null}
      </section>

      {guides.length === 0 ? (
        <p className="text-sm text-muted">No guides yet. Import one above.</p>
      ) : (
        guides.map((guide) => {
          const chapters = playbooks.filter((playbook) => playbook.guideId === guide.id);
          const published = chapters.filter((playbook) => playbook.status === "published").length;
          return (
            <section className="flex flex-col gap-3" key={guide.id}>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <h2 className="m-0 text-[18px] font-extrabold text-ink">{guide.title}</h2>
                  <span className="text-sm text-muted">
                    {[
                      guide.segmentLabel,
                      guide.edition ? `Edition ${guide.edition}` : null,
                      `${published} of ${chapters.length} published`,
                      guide.sourceName,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {published < chapters.length ? (
                    <button
                      className="btn-primary"
                      disabled={busyGuide === guide.id}
                      onClick={() => void guideAction(guide, "publish")}
                      type="button"
                    >
                      Publish all
                    </button>
                  ) : null}
                  {published > 0 ? (
                    <button
                      className="btn-secondary"
                      disabled={busyGuide === guide.id}
                      onClick={() => void guideAction(guide, "unpublish")}
                      type="button"
                    >
                      Unpublish all
                    </button>
                  ) : null}
                  <button
                    className="btn-secondary !text-danger"
                    disabled={busyGuide === guide.id}
                    onClick={() => void guideAction(guide, "delete")}
                    type="button"
                  >
                    Delete guide
                  </button>
                </div>
              </div>
              <ul className="divide-y divide-line overflow-hidden rounded-[14px] border border-line-strong bg-white shadow-[var(--shadow-card)]">
                {chapters.map((playbook) => (
                  <li key={playbook.id}>
                    <button
                      className="group flex w-full items-center gap-4 px-5 py-3.5 text-left hover:bg-blue-soft/40 focus-visible:bg-blue-soft/40 focus-visible:outline-none"
                      onClick={() => setOpenId(playbook.id)}
                      type="button"
                    >
                      <span className="num grid h-8 w-8 shrink-0 place-items-center rounded-full bg-bg text-[13px] font-extrabold text-ink-2">
                        {playbook.chapter}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-[16px] font-bold text-ink group-hover:text-blue">{playbook.title}</span>
                        <span className="text-[13px] text-muted">
                          {playbook.body.pitches.length} pitch{playbook.body.pitches.length === 1 ? "" : "es"} ·{" "}
                          {playbook.body.objections.length} objections · {playbook.body.stories.length} stories · v{playbook.version}
                        </span>
                      </span>
                      <StatusPill tone={playbook.status === "published" ? "success" : "neutral"}>
                        {playbook.status === "published" ? "Published" : "Draft"}
                      </StatusPill>
                      <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-muted group-hover:text-blue" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}

      {open ? (
        <PlaybookWorkbench
          guideTitle={guides.find((guide) => guide.id === open.guideId)?.title ?? ""}
          key={open.id}
          onClose={() => setOpenId(null)}
          onSaved={(saved) => setPlaybooks((current) => current.map((item) => (item.id === saved.id ? saved : item)))}
          playbook={open}
        />
      ) : null}
    </div>
  );
}

function PlaybookWorkbench({
  playbook,
  guideTitle,
  onClose,
  onSaved,
}: {
  playbook: CapabilityPlaybook;
  guideTitle: string;
  onClose: () => void;
  onSaved: (playbook: CapabilityPlaybook) => void;
}) {
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [title, setTitle] = useState(playbook.title);
  const [body, setBody] = useState<PlaybookBody>(playbook.body);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(status?: "draft" | "published") {
    setSaving(true);
    setError(null);
    const response = await fetch(`/api/admin/playbooks/${playbook.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...(dirty ? { title, body } : {}), ...(status ? { status } : {}) }),
    }).catch(() => null);
    const result = (await response?.json().catch(() => null)) as { playbook?: CapabilityPlaybook; error?: string } | null;
    setSaving(false);
    if (!response?.ok || !result?.playbook) {
      setError(result?.error ?? "That didn't save. Try again.");
      return;
    }
    setDirty(false);
    onSaved(result.playbook);
  }

  const close = () => {
    if (dirty && !window.confirm("Discard your unsaved changes?")) return;
    onClose();
  };

  const published = playbook.status === "published";

  return (
    <Drawer
      bodyWidth="full"
      eyebrow={`Playbook ${playbook.chapter} · ${guideTitle}`}
      footer={
        <>
          <button
            className="btn-primary"
            disabled={saving || (published && !dirty)}
            onClick={() => void save(published ? undefined : "published")}
            type="button"
          >
            {published ? (dirty ? "Save changes" : "Saved") : dirty ? "Save and publish" : "Publish"}
          </button>
          {!published && dirty ? (
            <button className="btn-secondary" disabled={saving} onClick={() => void save()} type="button">
              Save draft
            </button>
          ) : null}
          {published ? (
            <button className="btn-secondary" disabled={saving} onClick={() => void save("draft")} type="button">
              Unpublish
            </button>
          ) : null}
        </>
      }
      footerNote={
        error ? (
          <span className="text-danger" role="alert">
            {error}
          </span>
        ) : (
          `${published ? "Published in Learn" : "Draft, only admins can see it"} · version ${playbook.version}${dirty ? " · unsaved changes" : ""}`
        )
      }
      onClose={close}
      open
      subtitle={body.subtitle}
      title={title}
    >
      <div className="mx-auto flex w-full max-w-[860px] flex-col gap-6">
        <SegmentedToggle
          label="Workbench view"
          onChange={(value) => setMode(value as "preview" | "edit")}
          options={[
            { id: "preview", label: "Preview" },
            { id: "edit", label: "Edit" },
          ]}
          value={mode}
        />
        {mode === "preview" ? (
          <PlaybookView body={body} />
        ) : (
          <PlaybookEditor
            body={body}
            onChange={(next) => {
              setBody(next);
              setDirty(true);
            }}
            onTitleChange={(next) => {
              setTitle(next);
              setDirty(true);
            }}
            title={title}
          />
        )}
      </div>
    </Drawer>
  );
}
