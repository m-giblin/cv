"use client";

import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
      toast.error("Add a task title.");
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
      toast.error("Could not add task.");
      return;
    }

    toast.success(`Task added for ${personName}.`);
    setTitle("");
    setDescription("");
    setDueDate("");
    setOpen(false);
    router.refresh();
  }

  return (
    <section className="border border-[#E2DFD9] bg-[#F9F8F6] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-[#0D0E12]">Add ramp task</h3>
          <p className="mt-1 text-xs text-[#6B6860]">
            One-off assignments for this employee. You conduct the live sign-off when they submit.
          </p>
        </div>
        <Button onClick={() => setOpen((value) => !value)} size="sm" type="button" variant="outline">
          <Plus className="h-4 w-4" />
          {open ? "Cancel" : "Add task"}
        </Button>
      </div>

      {open ? (
        <form className="mt-4 space-y-3" onSubmit={handleAdd}>
          <Input onChange={(e) => setTitle(e.target.value)} placeholder="Task title" required value={title} />
          <Textarea
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What should they do? What will you validate live?"
            rows={3}
            value={description}
          />
          <Input onChange={(e) => setDueDate(e.target.value)} type="date" value={dueDate} />
          <Button disabled={isSaving} type="submit">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Add to ramp plan
          </Button>
        </form>
      ) : null}
    </section>
  );
}
