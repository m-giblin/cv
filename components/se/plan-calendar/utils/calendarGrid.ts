import type { CalMilestone } from "../types";

export interface CalGridDay {
  day: number;
  events: CalGridEvent[];
  isToday: boolean;
  isOtherMonth: boolean;
  cellBg: string;
}

export interface CalGridEvent {
  icon: string;
  title: string;
  type: string;
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

  const msMap: Record<number, CalMilestone[]> = {};
  milestones.forEach((ms) => {
    if (!ms.date) return;
    const d = new Date(ms.date).getDate();
    if (!msMap[d]) msMap[d] = [];
    msMap[d].push(ms);
  });

  for (let i = 0; i < prefixCount; i++) {
    days.push({ day: 0, events: [], isToday: false, isOtherMonth: true, cellBg: "#FAFAF8" });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = isCurrentMonth && d === todayDate;
    const events: CalGridEvent[] = (msMap[d] ?? []).map((ms) => ({
      icon: ms.icon,
      title: ms.title,
      type: ms.type,
      color:
        ms.status === "DONE"
          ? "#0A6E45"
          : ms.status === "DUE TODAY"
            ? "#B83128"
            : ms.status === "UPCOMING"
              ? "#A09D98"
              : "#0071CE",
      done: ms.status === "DONE",
      evBg:
        ms.status === "DONE"
          ? "rgba(10,110,69,.08)"
          : ms.status === "DUE TODAY"
            ? "rgba(184,49,40,.06)"
            : "rgba(0,113,206,.06)",
    }));
    days.push({ day: d, events, isToday, isOtherMonth: false, cellBg: isToday ? "#F0F7FF" : "#fff" });
  }

  return days;
}
