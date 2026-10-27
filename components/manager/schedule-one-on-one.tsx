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

/** Pick when the 1:1 is and who joins, then download an invite to open in the calendar. */
export function ScheduleOneOnOne({
  profile,
  mentor,
  talkingPoints,
  onClose,
}: {
  profile: Profile;
  mentor?: Profile;
  talkingPoints: string[];
  onClose: () => void;
}) {
  const ids = { date: useId(), time: useId(), length: useId(), mentor: useId() };
  const initial = defaultOneOnOneStart();
  const [date, setDate] = useState(`${initial.getFullYear()}-${pad(initial.getMonth() + 1)}-${pad(initial.getDate())}`);
  const [time, setTime] = useState("10:00");
  const [minutes, setMinutes] = useState(30);
  const [inviteMentor, setInviteMentor] = useState(Boolean(mentor));
  const firstName = profile.fullName.split(" ")[0] ?? profile.fullName;

  function download() {
    const start = new Date(`${date}T${time}:00`);
    if (Number.isNaN(start.getTime())) {
      toast.error("Pick a date and time.");
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
    toast.success(`Invite downloaded. Open it to add the 1:1 with ${firstName} to your calendar.`);
    onClose();
  }

  return (
    <Drawer
      eyebrow="1:1"
      footer={
        <>
          <button className="btn-primary" onClick={download} type="button">
            Download invite
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
        <p className="text-sm text-ink-2">The invite opens in your calendar app, where you can send it. The talking points go in the description.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink" htmlFor={ids.date}>
            Date
            <Input id={ids.date} onChange={(event) => setDate(event.target.value)} type="date" value={date} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink" htmlFor={ids.time}>
            Time
            <Input id={ids.time} onChange={(event) => setTime(event.target.value)} step={900} type="time" value={time} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink" htmlFor={ids.length}>
            Length
            <select className="w-full rounded-[10px] border border-line-strong bg-white px-3.5 py-[11px] text-[15px] font-medium text-ink" id={ids.length} onChange={(event) => setMinutes(Number(event.target.value))} value={minutes}>
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
            <input checked={inviteMentor} id={ids.mentor} onChange={(event) => setInviteMentor(event.target.checked)} type="checkbox" />
            Invite {mentor.fullName} (mentor) too
          </label>
        ) : null}
      </div>
    </Drawer>
  );
}
