// ============================================================
// utils/calendarSync.ts — Sync plan milestones to calendar
// ============================================================
// Option A (default): download .ics file — works with Outlook,
//   Google Calendar, Apple Calendar, no OAuth needed.
// Option B (production): Microsoft Graph API POST /me/events
//   Requires OAuth with Calendars.ReadWrite scope.
// ============================================================
import type { Milestone, SEDevProfile } from '../types/devPlans';

export function downloadMilestonesICS(se: SEDevProfile, goals: { title: string; milestones: Milestone[] }[]): void {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const events: string[] = [];

  goals.forEach(goal => {
    goal.milestones.filter(m => !m.done && m.date).forEach(ms => {
      const start = new Date(ms.date + ' ' + new Date().getFullYear());
      if (isNaN(start.getTime())) return;
      const end = new Date(start.getTime() + 30 * 60000);
      events.push([
        'BEGIN:VEVENT',
        `DTSTART:${fmt(start)}`,
        `DTEND:${fmt(end)}`,
        `SUMMARY:${goal.title} — ${ms.label}`,
        `DESCRIPTION:Development plan milestone for ${se.name} (${se.level})`,
        'STATUS:TENTATIVE',
        'END:VEVENT',
      ].join('\r\n'));
    });
  });

  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SailPoint Dev Plans//EN', ...events, 'END:VCALENDAR'].join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `dev-plan-${se.name.replace(/\s+/g, '-')}.ics`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// Production: Microsoft Graph API
// async function syncToGraphCalendar(se: SEDevProfile, milestones: Milestone[], accessToken: string) {
//   for (const ms of milestones) {
//     await fetch('https://graph.microsoft.com/v1.0/me/events', {
//       method: 'POST',
//       headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         subject: ms.label,
//         start: { dateTime: ms.date, timeZone: 'UTC' },
//         end: { dateTime: ms.date, timeZone: 'UTC' },
//         attendees: [{ emailAddress: { address: se.email }, type: 'required' }],
//       }),
//     });
//   }
// }
