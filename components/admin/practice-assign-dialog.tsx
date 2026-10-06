"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState, LinkButton, TextInput } from "@/components/admin/admin-ui";
import { Checkbox } from "@/components/ui/checkbox";
import { Modal } from "@/components/ui/modal";
import { PersonCell, rowHighlight } from "@/components/ui/table";
import type { PracticeItem } from "@/lib/admin/practice-library";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

/**
 * Assigns a simulation from the practice library to SEs through POST /api/simulations/assignments
 * (the same endpoint managers use). It appears in each SE's Practice, under "Assigned to you".
 */
export function PracticeAssignDialog({
  item,
  people,
  onClose,
  onAssigned,
}: {
  item: PracticeItem | null;
  people: Profile[];
  onClose: () => void;
  onAssigned?: (count: number) => void;
}) {
  const titleId = useId();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item) return;
    setSelected(new Set());
    setQuery("");
  }, [item]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...people]
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .filter((person) => !q || `${person.fullName} ${person.email}`.toLowerCase().includes(q));
  }, [people, query]);

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function assign() {
    if (!item?.sim || selected.size === 0) return;
    setSaving(true);
    const response = await fetch("/api/simulations/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId: item.sim.id,
        assignedToIds: [...selected],
        persona: item.sim.persona,
        vertical: item.sim.vertical,
        solutionFocus: item.sim.solutionFocus,
        difficulty: ["foundational", "intermediate", "advanced"].includes(item.sim.difficulty) ? item.sim.difficulty : undefined,
      }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
      toast.error(typeof body?.error === "string" ? body.error : "Could not assign. Try again.");
      return;
    }
    const body = (await response.json().catch(() => ({}))) as { assignedCount?: number };
    const count = body.assignedCount ?? selected.size;
    toast.success(`${item.name} assigned to ${count} SE${count === 1 ? "" : "s"}. It shows on their Practice page.`);
    onAssigned?.(count);
    onClose();
  }

  const count = selected.size;

  return (
    <Modal height={620} labelledBy={titleId} onClose={onClose} open={item !== null} width={640}>
      <div className="flex flex-col gap-1.5 border-b border-line bg-white px-6 pt-4 pb-3.5">
        <p className="label-caps label-caps--blue">Assign practice</p>
        <h2 className="truncate text-2xl leading-tight font-extrabold tracking-[-0.015em] text-ink" id={titleId}>
          {item?.name}
        </h2>
        <p className="text-sm text-ink-2">
          Runs as {item?.sim?.vertical ?? "set"}, {item?.sim?.difficulty ?? "intermediate"}. SEs see it under Assigned to you on
          their Practice page.
        </p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 px-6 py-4">
        <TextInput
          aria-label="Search people"
          className="rounded-full"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search people"
          type="search"
          value={query}
        />
        <ul aria-label="SEs" className="min-h-0 flex-1 overflow-y-auto rounded-[14px] border border-line bg-white">
          {visible.length === 0 ? (
            <li>
              <EmptyState>{people.length === 0 ? "No SEs in this tenant yet." : "No one matches that search."}</EmptyState>
            </li>
          ) : (
            visible.map((person) => {
              const on = selected.has(person.id);
              return (
                <li className={cn("border-t border-divider first:border-t-0", on && rowHighlight.ready)} key={person.id}>
                  <label className="flex cursor-pointer items-center gap-3.5 px-5 py-3">
                    <Checkbox checked={on} label={`Select ${person.fullName}`} onChange={() => toggle(person.id)} />
                    <PersonCell initials={initials(person.fullName)} name={person.fullName} subline={`${person.level} SE`} />
                  </label>
                </li>
              );
            })
          )}
        </ul>
      </div>
      <div className="flex flex-wrap items-center gap-[18px] border-t border-line bg-white px-6 py-3.5">
        <span className="text-sm text-ink-2">{count ? `${count} selected` : "Pick at least one SE"}</span>
        <div className="ml-auto flex items-center gap-[18px]">
          <LinkButton onClick={onClose}>Cancel</LinkButton>
          <button className="btn-primary" disabled={count === 0 || saving} onClick={() => void assign()} type="button">
            {saving ? "Assigning…" : count ? `Assign to ${count} SE${count === 1 ? "" : "s"}` : "Assign"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
