"use client";

import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { Field, TextArea } from "@/components/admin/admin-ui";
import type { HiringBrief } from "@/lib/mentoring/mentor-records-model";

/** The manager's brief for the mentor: who this hire is, and what the interview left open. */
export function HiringBriefEditor({ seUserId, seName }: { seUserId: string; seName: string }) {
  const ids = { background: useId(), watch: useId() };
  const firstName = seName.split(" ")[0] ?? seName;
  const [background, setBackground] = useState("");
  const [watchFor, setWatchFor] = useState("");
  const [saved, setSaved] = useState({ background: "", watchFor: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/mentor/hiring-brief?menteeId=${encodeURIComponent(seUserId)}`)
      .then(async (response) => {
        if (response.status === 403 || response.status === 404) return { forbidden: true, brief: null };
        const body = (await response.json().catch(() => ({}))) as { brief?: HiringBrief | null };
        return { forbidden: false, brief: body.brief ?? null };
      })
      .then((result) => {
        if (cancelled) return;
        setForbidden(result.forbidden);
        const next = { background: result.brief?.background ?? "", watchFor: result.brief?.watchFor ?? "" };
        setBackground(next.background);
        setWatchFor(next.watchFor);
        setSaved(next);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [seUserId]);

  const dirty = background !== saved.background || watchFor !== saved.watchFor;

  async function save() {
    setSaving(true);
    const response = await fetch("/api/mentor/hiring-brief", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ menteeId: seUserId, background, watchFor }),
    }).catch(() => null);
    setSaving(false);
    if (!response?.ok) {
      const data = (await response?.json().catch(() => null)) as { error?: unknown } | null;
      toast.error(typeof data?.error === "string" ? data.error : "Could not save the hiring brief.");
      return;
    }
    setSaved({ background, watchFor });
    toast.success(`Saved. ${firstName}'s mentor can see this.`);
  }

  if (loading || forbidden) return null;
  return (
    <section className="flex flex-col gap-3 rounded-[14px] border border-line bg-white p-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-[15px] font-bold text-ink">Hiring brief</h3>
        <p className="text-sm text-muted">
          {firstName}&apos;s mentor reads this before the first 1:1. Write what you hired them for, and what the interview
          left open.
        </p>
      </div>
      <Field htmlFor={ids.background} label="Background">
        <TextArea
          id={ids.background}
          onChange={(event) => setBackground(event.target.value)}
          placeholder="Came from a university IAM team. Strong on access reviews, new to selling."
          value={background}
        />
      </Field>
      <Field htmlFor={ids.watch} label="What to watch">
        <TextArea
          id={ids.watch}
          onChange={(event) => setWatchFor(event.target.value)}
          placeholder="Jumps to the product before asking what the customer is trying to do."
          value={watchFor}
        />
      </Field>
      {dirty ? (
        <button className="btn-primary self-start" disabled={saving} onClick={() => void save()} type="button">
          {saving ? "Saving…" : "Save hiring brief"}
        </button>
      ) : null}
    </section>
  );
}
