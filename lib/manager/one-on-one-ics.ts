/** The next business day at 10:00 local time: the default slot for a new 1:1. */
export function defaultOneOnOneStart(now = new Date()): Date {
  const start = new Date(now);
  const dayOffset = now.getDay() === 5 ? 3 : now.getDay() === 6 ? 2 : 1;
  start.setDate(start.getDate() + dayOffset);
  start.setHours(10, 0, 0, 0);
  return start;
}

/** Builds a tentative 1:1 invite. Without a start it uses the next business day at 10:00, 30 minutes. */
export function buildOneOnOneIcs(input: {
  name: string;
  email: string;
  level?: string;
  talkingPoints?: string[];
  now?: Date;
  start?: Date;
  durationMinutes?: number;
  /** Extra invitees, for example the mentor. */
  otherAttendees?: string[];
}): string {
  const now = input.now ?? new Date();
  const start = input.start ?? defaultOneOnOneStart(now);
  const end = new Date(start.getTime() + (input.durationMinutes ?? 30) * 60_000);
  const stamp = (date: Date) => `${date.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
  const escape = (text: string) => text.replace(/\\/g, "\\\\").replace(/[,;]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");

  const description = [
    `1:1 with ${input.name}`,
    ...(input.talkingPoints?.length ? ["", "Talking points:", ...input.talkingPoints.map((point) => `- ${point}`)] : []),
  ].join("\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SE Enablement//Coaching//EN",
    "BEGIN:VEVENT",
    `UID:${stamp(now)}-${input.email || input.name.replace(/\s+/g, "-")}`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(`1:1 — ${input.name}${input.level ? ` (${input.level})` : ""}`)}`,
    `DESCRIPTION:${escape(description)}`,
    "STATUS:TENTATIVE",
    ...(input.email ? [`ATTENDEE;RSVP=TRUE:MAILTO:${input.email}`] : []),
    ...(input.otherAttendees ?? []).filter(Boolean).map((email) => `ATTENDEE;RSVP=TRUE:MAILTO:${email}`),
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/** Client-only: downloads the invite as an .ics file. */
export function downloadOneOnOneIcs(input: Parameters<typeof buildOneOnOneIcs>[0]) {
  const blob = new Blob([buildOneOnOneIcs(input)], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `1on1-${input.name.replace(/\s+/g, "-")}.ics`;
  anchor.click();
  URL.revokeObjectURL(url);
}
