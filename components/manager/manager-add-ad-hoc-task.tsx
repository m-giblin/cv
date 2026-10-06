"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const INPUT_CLASS =
  "w-full rounded-[10px] border border-line-strong bg-white px-3 py-2 text-[15px] font-normal text-ink";
const LABEL_CLASS = "block space-y-1.5 text-sm font-semibold text-ink";

export function ManagerAddAdHocTask({
  assignmentId,
  personName,
}: {
  assignmentId: string;
  personName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (title.trim().length < 3) {
      toast.error("Add a task title");
      return;
    }

    setIsSaving(true);
    const response = await fetch(`/api/plans/assignments/${assignmentId}/ad-hoc-steps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate || undefined,
        isManagerGate: true,
      }),
    });
    setIsSaving(false);

    if (!response.ok) {
      toast.error("Couldn't add the task");
      return;
    }

    toast.success(`Task added for ${personName}`);
    setTitle("");
    setDescription("");
    setDueDate("");
    setOpen(false);
    router.refresh();
  }

  return (
    <section className="rounded-[14px] border border-line bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-bold text-ink">Add ramp task</h3>
          <p className="mt-1 text-sm text-muted">
            A one-off task for this SE. You run the live sign-off when they submit it.
          </p>
        </div>
        <button
          aria-expanded={open}
          className="link text-sm"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          {open ? "Cancel" : "Add task"}
        </button>
      </div>

      {open ? (
        <form className="mt-4 space-y-3" onSubmit={handleAdd}>
          <label className={LABEL_CLASS}>
            <span className="block">Task title</span>
            <input
              className={INPUT_CLASS}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              required
              value={title}
            />
          </label>
          <label className={LABEL_CLASS}>
            <span className="block">Description</span>
            <textarea
              className={INPUT_CLASS}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What should they do? What will you validate live?"
              rows={3}
              value={description}
            />
          </label>
          <label className={LABEL_CLASS}>
            <span className="block">Due date (optional)</span>
            <input
              className={INPUT_CLASS}
              onChange={(e) => setDueDate(e.target.value)}
              type="date"
              value={dueDate}
            />
          </label>
          <button
            className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
            Add to ramp plan
          </button>
        </form>
      ) : null}
    </section>
  );
}
