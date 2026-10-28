"use client";

import { useId, useState } from "react";
import { toast } from "sonner";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { defaultOneOnOneStart, downloadOneOnOneIcs } from "@/lib/manager/one-on-one-ics";
import type { Profile } from "@/lib/types";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Pick when the 1:1 is and who joins. Saving records it (the person sees it on Today and is told,
 * so is the mentor if invited) and downloads an invite to send from the calendar.
 */
export function ScheduleOneOnOne({
  profile,
  mentor,
  talkingPoints,
  onClose,
  onScheduled,
}: {
  profile: Profile;
  mentor?: Profile;
  talkingPoints: string[];
  onClose: () => void;
  onScheduled?: () => void;
}) {
  const ids = { date: useId(), time: useId(), length: useId(), mentor: useId() };
  const initial = defaultOneOnOneStart();
  const [date, setDate] = useState(`${initial.getFullYear()}-${pad(initial.getMonth() + 1)}-${pad(initial.getDate())}`);
  const [time, setTime] = useState("10:00");
  const [minutes, setMinutes] = useState(30);
  const [inviteMentor, setInviteMentor] = useState(Boolean(mentor));
  const [saving, setSaving] = useState(false);
  // Set when the time overlaps another 1:1 the manager or mentor is in; the next click keeps the time.
  const [clash, setClash] = useState<string | null>(null);
  const firstName = profile.fullName.split(" ")[0] ?? profile.fullName;

  async function schedule() {
    const start = new Date(`${date}T${time}:00`);
    if (Number.isNaN(start.getTime())) {
      toast.error("Pick a date and time.");
      return;
    }
    const label = start.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
    setSaving(true);
    const response = await fetch("/api/manager/one-on-ones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: profile.id,
        start: start.toISOString(),
        minutes,
        label,
        inviteMentor: inviteMentor && Boolean(mentor),
        allowClash: Boolean(clash),
      }),
    }).catch(() => null);
    setSaving(false);
    if (response?.status === 409) {
      const body = (await response.json().catch(() => null)) as { clash?: string } | null;
      setClash(body?.clash ?? "That time overlaps another 1:1.");
      return;
    }
    if (!response?.ok) {
      const body = (await response?.json().catch(() => null)) as { error?: string } | null;
      toast.error(body?.error ?? "Couldn't schedule the 1:1. Try again.");
      return;
    }
    downloadOneOnOneIcs({
      name: profile.fullName,
      email: profile.email,
      level: profile.level,
      talkingPoints: talkingPoints.slice(0, 4),
      start,
      durationMinutes: minutes,
      otherAttendees: inviteMentor && mentor ? [mentor.email] : [],
    });
    toast.success(`1:1 saved. ${firstName} can see it on Today. Open the downloaded invite to send it from your calendar.`);
    onScheduled?.();
    onClose();
  }

  return (
    <Drawer
      eyebrow="1:1"
      footer={
        <>
          <button className="btn-primary" disabled={saving} onClick={() => void schedule()} type="button">
            {saving ? "Scheduling…" : clash ? "Schedule anyway" : "Schedule and download invite"}
          </button>
          <button className="btn-secondary" onClick={onClose} type="button">
            Cancel
          </button>
        </>
      }
      onClose={onClose}
      open
      size="form"
      title={`Schedule a 1:1 with ${firstName}`}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-2">{firstName} sees the 1:1 on their Today page and gets a notification{mentor ? ", and so does the mentor if invited" : ""}. The invite downloads for your calendar app, where you send it; the talking points go in its description.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink" htmlFor={ids.date}>
            Date
            <Input
              id={ids.date}
              min={todayIso()}
              onChange={(event) => {
                setDate(event.target.value);
                setClash(null);
              }}
              type="date"
              value={date}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink" htmlFor={ids.time}>
            Time
            <Input
              id={ids.time}
              onChange={(event) => {
                setTime(event.target.value);
                setClash(null);
              }}
              step={900}
              type="time"
              value={time}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink" htmlFor={ids.length}>
            Length
            <select className="w-full rounded-[10px] border border-line-strong bg-white px-3.5 py-[11px] text-[15px] font-medium text-ink" id={ids.length} onChange={(event) => {
                setMinutes(Number(event.target.value));
                setClash(null);
              }} value={minutes}>
              {[15, 30, 45, 60].map((value) => (
                <option key={value} value={value}>
                  {value} minutes
                </option>
              ))}
            </select>
          </label>
        </div>
        {mentor ? (
          <label className="flex items-center gap-2 text-sm text-ink" htmlFor={ids.mentor}>
            <input
              checked={inviteMentor}
              id={ids.mentor}
              onChange={(event) => {
                setInviteMentor(event.target.checked);
                setClash(null);
              }}
              type="checkbox"
            />
            Invite {mentor.fullName} (mentor) too
          </label>
        ) : null}
        {clash ? (
          <p className="m-0 rounded-[10px] border border-line bg-signal-soft px-4 py-3 text-sm text-ink" role="alert">
            {clash} Pick another time, or schedule anyway.
          </p>
        ) : null}
      </div>
    </Drawer>
  );
}
