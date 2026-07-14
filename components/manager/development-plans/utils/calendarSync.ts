import type { Milestone, SEDevProfile } from "../types";

export function downloadMilestonesICS(
  se: SEDevProfile,
  goals: { title: string; milestones: Milestone[] }[],
): void {
  const fmt = (d: Date) => `${d.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
  const events: string[] = [];

  goals.forEach((goal) => {
    goal.milestones
      .filter((m) => !m.done && m.date)
      .forEach((ms) => {
        const start = new Date(`${ms.date} ${new Date().getFullYear()}`);
        if (Number.isNaN(start.getTime())) return;
        const end = new Date(start.getTime() + 30 * 60000);
        events.push(
          [
            "BEGIN:VEVENT",
            `DTSTART:${fmt(start)}`,
            `DTEND:${fmt(end)}`,
            `SUMMARY:${goal.title} — ${ms.label}`,
            `DESCRIPTION:Development plan milestone for ${se.name} (${se.level})`,
            "STATUS:TENTATIVE",
            "END:VEVENT",
          ].join("\r\n"),
        );
      });
  });

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SailPoint Dev Plans//EN",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `dev-plan-${se.name.replace(/\s+/g, "-")}.ics`;
  a.click();
  URL.revokeObjectURL(a.href);
}
