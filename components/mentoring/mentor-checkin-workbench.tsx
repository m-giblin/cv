"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { Field, TextArea, TextInput } from "@/components/admin/admin-ui";
import { Checkbox } from "@/components/ui/checkbox";
import { Drawer } from "@/components/ui/drawer";
import { agendaForCheckin, type AgendaItem, type MenteeRecords } from "@/lib/mentoring/mentor-records-model";
import type { UserPlan } from "@/lib/types";

const CARD_CLS = "flex flex-col gap-3 rounded-[14px] border border-line bg-white p-[18px]";

const KIND_LABEL: Record<AgendaItem["kind"], string> = {
  kickoff: "First meeting",
  overdue: "Late",
  submitted: "Debrief",
  due_soon: "This week",
  gate: "Gate",
  follow_up: "Follow-up",
};

const STANDING_TOPICS = [
  "What went well since we last met?",
  "Where are you stuck?",
  "What do you want to practise before our next 1:1?",
];

function shortDate(iso: string) {
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Plan and log a 1:1: an agenda from where the mentee is, notes, and next actions sent to the mentee. */
export function MentorCheckinWorkbench({
  open,
  onClose,
  plan,
  menteeName,
  records,
}: {
  open: boolean;
  onClose: () => void;
  plan: UserPlan;
  menteeName: string;
  records: MenteeRecords;
}) {
  const router = useRouter();
  const ids = { date: useId(), notes: useId(), next: useId() };
  const today = new Date().toISOString().slice(0, 10);
  const agenda = useMemo(() => agendaForCheckin(plan.steps, records, today), [plan.steps, records, today]);
  const [covered, setCovered] = useState<Set<string>>(new Set());
  const [metOn, setMetOn] = useState(today);
  const [notes, setNotes] = useState("");
  const [nextActions, setNextActions] = useState("");
  const [saving, setSaving] = useState(false);
  const firstName = menteeName.split(" ")[0] ?? menteeName;
  const checkins = records.checkins.filter((item) => item.assignmentId === plan.id);

  function toggle(text: string) {
    setCovered((current) => {
      const next = new Set(current);
      if (next.has(text)) next.delete(text);
      else next.add(text);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    const response = await fetch("/api/mentor/checkins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignmentId: plan.id, metOn, agenda: [...covered], notes, nextActions }),
    }).catch(() => null);
    setSaving(false);
    if (!response?.ok) {
      const data = (await response?.json().catch(() => null)) as { error?: unknown } | null;
      toast.error(typeof data?.error === "string" ? data.error : "Could not save the check-in.");
      return;
    }
    toast.success(nextActions.trim() ? `Saved. ${firstName} has the next actions.` : "Check-in saved.");
    setNotes("");
    setNextActions("");
    setCovered(new Set());
    router.refresh();
    onClose();
  }

  return (
    <Drawer
      eyebrow="Mentor 1:1"
      footer={
        <button
          className="btn-primary"
          disabled={saving || (!notes.trim() && !nextActions.trim())}
          onClick={() => void save()}
          type="button"
        >
          {saving ? "Saving…" : "Save check-in"}
        </button>
      }
      footerNote={`Next actions are sent to ${firstName}. Your notes stay in your 1:1 history.`}
      mainLabel="Agenda"
      onClose={onClose}
      open={open}
      side={
        <>
          <Field htmlFor={ids.date} label="Date of the 1:1">
            <TextInput id={ids.date} max={today} onChange={(event) => setMetOn(event.target.value)} type="date" value={metOn} />
          </Field>
          <Field htmlFor={ids.notes} label="Notes">
            <TextArea
              className="min-h-40"
              id={ids.notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="What you talked about and what you noticed"
              value={notes}
            />
          </Field>
          <Field hint={`${firstName} gets these as a notification.`} htmlFor={ids.next} label="Next actions">
            <TextArea
              id={ids.next}
              onChange={(event) => setNextActions(event.target.value)}
              placeholder="For example: rerun the discovery simulation and send me the score by Friday"
              value={nextActions}
            />
          </Field>
          {checkins.length ? (
            <section className="flex flex-col gap-2">
              <h3 className="text-lg font-extrabold text-ink">Past 1:1s</h3>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {checkins.slice(0, 6).map((item) => (
                  <li className={CARD_CLS} key={item.id}>
                    <p className="text-sm font-bold text-ink">{shortDate(item.metOn)}</p>
                    {item.notes ? <p className="whitespace-pre-wrap text-[15px] text-ink-2">{item.notes}</p> : null}
                    {item.nextActions ? (
                      <p className="text-[15px] text-ink-2">
                        <span className="font-bold text-ink">Next: </span>
                        {item.nextActions}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      }
      sideLabel="Log it"
      subtitle={`${menteeName} · ${plan.name}`}
      title={`1:1 with ${firstName}`}
    >
      <p className="text-[15px] text-ink-2">
        {agenda.firstMeeting
          ? `This is the first 1:1 logged with ${firstName}. Set how you will work. The status agenda starts once this one is saved.`
          : `Built from ${firstName}'s program right now. Tick what you covered; it is saved with your notes.`}
      </p>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-lg font-extrabold text-ink">{agenda.firstMeeting ? "First meeting" : "From the program"}</legend>
        {agenda.items.length === 0 ? <p className="text-[15px] text-muted">Nothing late, waiting or due this week.</p> : null}
        {agenda.items.map((item) => (
          <label className="flex cursor-pointer items-start gap-3 rounded-[12px] border border-line bg-white px-4 py-3" key={item.text}>
            <Checkbox checked={covered.has(item.text)} onChange={() => toggle(item.text)} />
            <span className="flex flex-col">
              <span className="label-caps">{KIND_LABEL[item.kind]}</span>
              <span className="text-[15px] text-ink">{item.text}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {agenda.firstMeeting ? null : (
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-lg font-extrabold text-ink">Every 1:1</legend>
        {STANDING_TOPICS.map((text) => (
          <label className="flex cursor-pointer items-start gap-3 rounded-[12px] border border-line bg-white px-4 py-3" key={text}>
            <Checkbox checked={covered.has(text)} onChange={() => toggle(text)} />
            <span className="text-[15px] text-ink">{text}</span>
          </label>
        ))}
      </fieldset>
      )}
    </Drawer>
  );
}
