"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

type CanceledItem = { id: string; person: string; title: string };

/** Canceled challenges waiting on a conversation. The manager allows the restart after they talk. */
export function CanceledChallengesAlert() {
  const [items, setItems] = useState<CanceledItem[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/challenge-attempts/team", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((body: { items?: CanceledItem[] }) => setItems(body.items ?? []))
      .catch(() => setItems([]));
  }, []);

  async function allowRestart(item: CanceledItem) {
    setSaving(item.id);
    const response = await fetch(`/api/challenge-attempts/${item.id}/allow-restart`, { method: "POST" }).catch(() => null);
    setSaving(null);
    if (!response?.ok) {
      toast.error("Could not allow the restart. Try again.");
      return;
    }
    setItems((current) => current.filter((row) => row.id !== item.id));
    toast.success(`${item.person.split(" ")[0]} can now restart this challenge.`);
  }

  if (items.length === 0) return null;

  return (
    <section aria-label="Canceled challenges to talk about" className="mb-5 rounded-[14px] bg-danger-soft px-5 py-4">
      <p className="label-caps text-danger">Needs a conversation</p>
      <ul className="mt-2 flex flex-col gap-3">
        {items.map((item) => (
          <li className="flex flex-wrap items-center justify-between gap-3" key={item.id}>
            <p className="min-w-0 text-[15px] leading-[1.5] text-ink">
              <strong>{item.person}</strong> didn&apos;t turn in {item.title} within 5 working days, so it was canceled.
            </p>
            <button className="btn-secondary" disabled={saving === item.id} onClick={() => void allowRestart(item)} type="button">
              {saving === item.id ? "Saving…" : "We talked, allow restart"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
