"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
};

/** "Your training" on Manager Today: what the manager's own manager assigned them. Hidden when there's none. */
export function MyTrainingCard() {
  const [items, setItems] = useState<AssignedWorkItem[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/me/training")
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((body: { items?: AssignedWorkItem[] }) => !cancelled && setItems(body.items ?? []))
      .catch(() => !cancelled && setItems([]));
    return () => {
      cancelled = true;
    };
  }, []);

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
              <Link className="block truncate text-sm font-bold text-ink hover:text-blue hover:underline" href={item.href ?? OPEN_HREF[item.kind]}>
                {item.title}
              </Link>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-0.5">
              <StatusPill tone={item.state === "overdue" ? "danger" : item.state === "in_progress" ? "blue" : "neutral"}>
                {item.state === "overdue" ? "Overdue" : item.state === "in_progress" ? "In progress" : "Not started"}
              </StatusPill>
              <span className="text-[12px] text-muted">{item.dueText}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[13px] text-muted">Assigned to you by your manager. It counts the same way it does for your SEs.</p>
    </section>
  );
}
