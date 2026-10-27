"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { KIND_LABEL } from "@/components/manager/assigned-work-list";
import { StatusPill } from "@/components/ui/status-pill";
import type { AssignedWorkItem, AssignedWorkKind } from "@/lib/manager/assigned-work";

/** Where to do each kind of training. */
const OPEN_HREF: Record<AssignedWorkKind, string> = {
  playbook: "/learn/playbooks",
  simulation: "/practice/simulations",
  pitch: "/practice/pitch",
  ramp_task: "/my-plan",
  quiz: "/learn/knowledge-checks",
  content: "/learn",
};

/**
 * "Your training": what the signed-in person's manager assigned them, on Today for SEs and managers.
 * Library items are marked done here; everything else completes where it's done. Hidden when empty.
 */
export function MyTrainingCard({ forManager = true }: { forManager?: boolean }) {
  const [items, setItems] = useState<AssignedWorkItem[] | null>(null);
  const [marking, setMarking] = useState<string | null>(null);
  const load = useCallback(() => {
    return fetch("/api/me/training")
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((body: { items?: AssignedWorkItem[] }) => setItems(body.items ?? []))
      .catch(() => setItems([]));
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function markDone(item: AssignedWorkItem) {
    setMarking(item.id);
    const response = await fetch(`/api/me/training/content/${item.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: true }),
    }).catch(() => null);
    setMarking(null);
    if (!response?.ok) {
      toast.error("Couldn't mark it done. Try again.");
      return;
    }
    toast.success(`${item.title} marked done. Your manager can see it.`);
    void load();
  }

  const open = (items ?? []).filter((item) => item.state !== "done");
  if (!open.length) return null;
  const overdue = open.filter((item) => item.state === "overdue").length;

  return (
    <section aria-label="Your training" className="flex flex-col gap-3 rounded-[14px] border border-line bg-white p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[16px] font-extrabold text-ink">Your training</h2>
        <span className={overdue ? "text-[13px] font-bold text-danger" : "text-[13px] text-muted"}>
          {open.length} open{overdue ? ` · ${overdue} overdue` : ""}
        </span>
      </div>
      <ul className="flex flex-col">
        {open.slice(0, 5).map((item) => (
          <li className="flex items-center justify-between gap-3 border-t border-divider py-2.5 first:border-t-0" key={`${item.kind}:${item.id}`}>
            <span className="min-w-0">
              <span className="block text-[13px] text-muted">{KIND_LABEL[item.kind]}</span>
              {item.kind === "content" && item.href?.startsWith("http") ? (
                <a className="block truncate text-sm font-bold text-ink hover:text-blue hover:underline" href={item.href} rel="noreferrer" target="_blank">
                  {item.title}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                <Link className="block truncate text-sm font-bold text-ink hover:text-blue hover:underline" href={item.href ?? OPEN_HREF[item.kind]}>
                  {item.title}
                </Link>
              )}
            </span>
            <span className="flex shrink-0 flex-col items-end gap-0.5">
              {item.kind === "content" ? (
                <button
                  className="link text-[13px] disabled:opacity-60"
                  disabled={marking === item.id}
                  onClick={() => void markDone(item)}
                  type="button"
                >
                  {marking === item.id ? "Saving…" : "Mark done"}
                </button>
              ) : null}
              <StatusPill tone={item.state === "overdue" ? "danger" : item.state === "in_progress" ? "blue" : "neutral"}>
                {item.state === "overdue" ? "Overdue" : item.state === "in_progress" ? "In progress" : "Not started"}
              </StatusPill>
              <span className="text-[12px] text-muted">{item.dueText}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[13px] text-muted">
        {forManager
          ? "Assigned to you by your manager. It counts the same way it does for your SEs."
          : "Assigned to you by your manager, on top of your ramp. Library items: open them, then mark them done here."}
      </p>
    </section>
  );
}
