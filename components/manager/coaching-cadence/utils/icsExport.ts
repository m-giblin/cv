import type { SEProfile } from "../types";

export function generateICS(se: SEProfile): void {
  const now = new Date();
  const start = new Date(now);
  const dayOffset = now.getDay() === 5 ? 3 : now.getDay() === 6 ? 2 : 1;
  start.setDate(start.getDate() + dayOffset);
  start.setHours(10, 0, 0, 0);
  const end = new Date(start.getTime() + 30 * 60000);

  const fmt = (d: Date) => `${d.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;

  const briefLines = se.brief.map((pt) => pt.text).join("\n\n");
  const desc = [
    `Coaching 1:1 — ${se.name}`,
    `Status: ${se.healthLabel} | Day ${se.day} of ramp | Sim avg: ${se.simAvg}`,
    "",
    "AI BRIEF:",
    briefLines,
    "",
    "Action items:",
    ...se.brief.filter((pt) => pt.hasAction).map((pt) => `* ${pt.action}`),
  ].join("\n");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SailPoint Coaching//EN",
    "BEGIN:VEVENT",
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:1:1 Coaching — ${se.name} (${se.level})`,
    `DESCRIPTION:${desc.replace(/\n/g, "\\n")}`,
    "LOCATION:Microsoft Teams",
    "STATUS:TENTATIVE",
    "ORGANIZER:MAILTO:manager@sailpoint.com",
    `ATTENDEE;RSVP=TRUE:MAILTO:${se.email || "se@sailpoint.com"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `1on1-${se.name.replace(/\s+/g, "-")}.ics`;
  a.click();
  URL.revokeObjectURL(a.href);
}
