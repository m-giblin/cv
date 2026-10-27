"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Field, TextArea } from "@/components/admin/admin-ui";
import { Drawer } from "@/components/ui/drawer";
import type { ManagerNote } from "@/lib/mentoring/mentor-records-model";

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Send the hiring manager a strength, a risk, and what the mentor is doing about it. */
export function MentorManagerNote({
  open,
  onClose,
  assignmentId,
  menteeName,
  notes,
}: {
  open: boolean;
  onClose: () => void;
  assignmentId: string;
  menteeName: string;
  notes: ManagerNote[];
}) {
  const router = useRouter();
  const ids = { strength: useId(), risk: useId(), action: useId() };
  const firstName = menteeName.split(" ")[0] ?? menteeName;
  const [strength, setStrength] = useState("");
  const [risk, setRisk] = useState("");
  const [action, setAction] = useState("");
  const [saving, setSaving] = useState(false);
  const ready = strength.trim().length >= 10 && risk.trim().length >= 10 && action.trim().length >= 10;

  async function send() {
    setSaving(true);
    const response = await fetch("/api/mentor/manager-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignmentId, strength, risk, action }),
    }).catch(() => null);
    setSaving(false);
    if (!response?.ok) {
      const data = (await response?.json().catch(() => null)) as { error?: unknown } | null;
      toast.error(typeof data?.error === "string" ? data.error : "Could not send the note.");
      return;
    }
    toast.success(`Sent to ${firstName}'s manager.`);
    setStrength("");
    setRisk("");
    setAction("");
    router.refresh();
    onClose();
  }

  return (
    <Drawer
      dirty={Boolean(strength.trim() || risk.trim() || action.trim())}
      eyebrow="For the hiring manager"
      footer={
        <button className="btn-primary" disabled={saving || !ready} onClick={() => void send()} type="button">
          {saving ? "Sending…" : "Send to the manager"}
        </button>
      }
      footerNote="The manager sees this in their inbox. The mentee does not."
      mainLabel="The note"
      onClose={onClose}
      open={open}
      side={
        notes.length ? (
          <section className="flex flex-col gap-2">
            <h3 className="text-lg font-extrabold text-ink">Notes you have sent</h3>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {notes.slice(0, 6).map((note) => (
                <li className="flex flex-col gap-1 rounded-[14px] border border-line bg-white p-4" key={note.id}>
                  <p className="text-sm font-bold text-ink">
                    {shortDate(note.createdAt)}
                    {note.acknowledged ? "" : " · waiting on the manager"}
                  </p>
                  <p className="text-[15px] text-ink-2">{note.risk}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <p className="text-[15px] text-muted">No notes sent yet. A short one in week two is more useful than a long one at the gate.</p>
        )
      }
      sideLabel="History"
      subtitle={`${menteeName} · one strength, one risk, what you are doing`}
      title={`Note on ${firstName}`}
    >
      <Field htmlFor={ids.strength} label="One strength">
        <TextArea
          id={ids.strength}
          onChange={(event) => setStrength(event.target.value)}
          placeholder="Explains joiner-mover-leaver with a university example, without naming the product."
          value={strength}
        />
      </Field>
      <Field htmlFor={ids.risk} label="One risk">
        <TextArea
          id={ids.risk}
          onChange={(event) => setRisk(event.target.value)}
          placeholder="Still opens customer conversations with a feature. We have hit it twice."
          value={risk}
        />
      </Field>
      <Field htmlFor={ids.action} label="What you are doing">
        <TextArea
          id={ids.action}
          onChange={(event) => setAction(event.target.value)}
          placeholder="Rerunning the discovery simulation together on Thursday, and I will sit in."
          value={action}
        />
      </Field>
    </Drawer>
  );
}
