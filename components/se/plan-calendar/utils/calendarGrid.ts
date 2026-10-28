import type { CalMilestone } from "../types";

export interface CalGridDay {
  day: number;
  events: CalGridEvent[];
  isToday: boolean;
  isOtherMonth: boolean;
  cellBg: string;
}

export interface CalGridEvent {
  href?: string;
  icon: string;
  title: string;
  type: string;
  status: CalMilestone["status"];
  color: string;
  done: boolean;
  evBg: string;
}

export function buildMonthGrid(year: number, month: number, milestones: CalMilestone[]): CalGridDay[] {
  const days: CalGridDay[] = [];
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const prefixCount = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const now = new Date();
  const isCurrentMonth = now.getMonth() + 1 === month && now.getFullYear() === year;
  const todayDate = now.getDate();

  // Dates are calendar days ("2026-11-02"): read the parts, not new Date(), which takes them as
  // UTC midnight and puts every step on the day before. Keep only this month's steps.
  const prefix = `${year}-${String(month).padStart(2, "0")}-`;
  const msMap: Record<number, CalMilestone[]> = {};
  milestones.forEach((ms) => {
    if (!ms.date?.startsWith(prefix)) return;
    const d = Number(ms.date.slice(8, 10));
    if (!msMap[d]) msMap[d] = [];
    msMap[d].push(ms);
  });

  for (let i = 0; i < prefixCount; i++) {
    days.push({ day: 0, events: [], isToday: false, isOtherMonth: true, cellBg: "#E9EDF5" });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = isCurrentMonth && d === todayDate;
    const events: CalGridEvent[] = (msMap[d] ?? []).map((ms) => ({
      href: ms.href,
      icon: ms.icon,
      title: ms.title,
      type: ms.type,
      status: ms.status,
      color:
        ms.status === "DONE"
          ? "#0033A1"
          : ms.status === "DUE TODAY"
            ? "#0A1A3F"
            : ms.status === "UPCOMING"
              ? "#9AA6C2"
              : "#B42318",
      done: ms.status === "DONE",
      evBg:
        ms.status === "DONE"
          ? "#E5ECFA"
          : ms.status === "DUE TODAY"
            ? "#FFB81C"
            : ms.status === "OPEN"
              ? "#FCEBEA"
              : "#FFFFFF",
    }));
    days.push({ day: d, events, isToday, isOtherMonth: false, cellBg: isToday ? "#FFF6E0" : "#FFFFFF" });
  }

  return days;
}
