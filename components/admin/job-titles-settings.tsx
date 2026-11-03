"use client";

import { Plus, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { LineCard, SecondaryButton, SelectInput, TextInput } from "@/components/admin/admin-ui";
import { ACCESS_LABEL, JOB_TITLE_MAX, JOB_TITLES_MAX, type JobTitle, type JobTitleAccess } from "@/lib/tenant/job-titles";

const ACCESS_OPTIONS = Object.entries(ACCESS_LABEL) as [JobTitleAccess, string][];

/** Admin › Settings › General: the job titles people in this tenant can have, each with its access level. */
export function JobTitlesSettings() {
  const id = useId();
  const [titles, setTitles] = useState<JobTitle[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/admin/job-titles")
      .then((response) => response.json())
      .then((body: { titles?: JobTitle[]; note?: string }) => {
        setTitles(body.titles ?? []);
        setNote(body.note ?? null);
      })
      .catch(() => setTitles([]));
  }, []);

  if (!titles) return null;

  const update = (index: number, change: Partial<JobTitle>) =>
    setTitles((current) => current!.map((title, at) => (at === index ? { ...title, ...change } : title)));

  async function save() {
    setSaving(true);
    const response = await fetch("/api/admin/job-titles", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titles: titles!.filter((title) => title.name.trim()) }),
    });
    const body = (await response.json().catch(() => null)) as { titles?: JobTitle[]; error?: string } | null;
    setSaving(false);
    if (!response.ok || !body?.titles) return void toast.error(body?.error ?? "Couldn't save job titles.");
    setTitles(body.titles);
    toast.success("Job titles saved.");
  }

  return (
    <LineCard meta="What you pick when adding someone in People" title="Job titles">
      <div className="flex flex-col gap-3">
        <p className="m-0 text-sm text-muted">
          Name the roles people have here, like &quot;Account Executive&quot; or &quot;Sales Manager&quot;. The access level decides what they can
          do. With no titles, People uses the built-in roles.
        </p>
        {note ? <p className="m-0 rounded-[10px] bg-signal-soft px-3 py-2 text-sm text-ink">{note}</p> : null}
        {titles.length ? (
          <ul className="flex flex-col gap-2">
            {titles.map((title, index) => (
              <li className="flex flex-wrap items-center gap-2" key={index}>
                <TextInput
                  aria-label="Job title"
                  className="min-w-0 flex-1"
                  id={`${id}-name-${index}`}
                  maxLength={JOB_TITLE_MAX}
                  onChange={(event) => update(index, { name: event.target.value })}
                  placeholder="Account Executive"
                  value={title.name}
                />
                <SelectInput
                  aria-label="Access level"
                  className="w-auto"
                  id={`${id}-access-${index}`}
                  onChange={(event) => update(index, { access: event.target.value as JobTitleAccess })}
                  value={title.access}
                >
                  {ACCESS_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </SelectInput>
                <button
                  aria-label={`Remove ${title.name || "this title"}`}
                  className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-bg hover:text-ink"
                  onClick={() => setTitles((current) => current!.filter((_, at) => at !== index))}
                  type="button"
                >
                  <X aria-hidden size={16} />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <SecondaryButton
            className="inline-flex items-center gap-1.5"
            disabled={titles.length >= JOB_TITLES_MAX}
            onClick={() => setTitles((current) => [...current!, { name: "", access: "learner" }])}
          >
            <Plus aria-hidden size={16} /> Add a title
          </SecondaryButton>
          <button className="btn-primary" disabled={saving} onClick={() => void save()} type="button">
            {saving ? "Saving…" : "Save job titles"}
          </button>
        </div>
      </div>
    </LineCard>
  );
}
