import type { CalWeek } from "./types";

export const DEMO_CALENDAR_WEEKS: CalWeek[] = [
  {
    label: "Week 1 · Jul 7–11",
    done: true,
    milestones: [
      {
        day: "Mon Jul 7",
        title: "Identity Security Fundamentals — Module 1",
        type: "Learn",
        status: "DONE",
        icon: "📚",
        date: "2026-07-07",
      },
      {
        day: "Wed Jul 9",
        title: "Discovery fundamentals challenge",
        type: "Challenge",
        status: "DONE",
        icon: "⚡",
        date: "2026-07-09",
      },
      {
        day: "Fri Jul 11",
        title: "Gate 1 check-in with manager",
        type: "1:1",
        status: "DONE",
        icon: "🗓️",
        managerNote: "Great session! Keep going.",
        date: "2026-07-11",
      },
    ],
  },
  {
    label: "Week 2 · Jul 14–18",
    done: false,
    milestones: [
      {
        day: "Mon Jul 14",
        title: "CISO roleplay simulation",
        type: "Sim",
        status: "DUE TODAY",
        icon: "🎭",
        date: "2026-07-14",
      },
      {
        day: "Wed Jul 16",
        title: "ISC Lab: connector configuration",
        type: "Lab",
        status: "OPEN",
        icon: "🔬",
        date: "2026-07-16",
      },
      {
        day: "Fri Jul 18",
        title: "SLED practice sim ×1",
        type: "Sim",
        status: "OPEN",
        icon: "🎭",
        date: "2026-07-18",
      },
    ],
  },
  {
    label: "Week 3 · Jul 21–25",
    done: false,
    milestones: [
      {
        day: "Mon Jul 21",
        title: "Multi-stakeholder discovery sim",
        type: "Sim",
        status: "UPCOMING",
        icon: "🎭",
        date: "2026-07-21",
      },
      {
        day: "Wed Jul 23",
        title: "Identity Security Fundamentals cert exam",
        type: "Cert",
        status: "UPCOMING",
        icon: "🏆",
        date: "2026-07-23",
      },
      {
        day: "Fri Jul 25",
        title: "Gate 2 sign-off meeting",
        type: "Gate",
        status: "UPCOMING",
        icon: "🚧",
        managerNote: "Manager must approve before Phase 2",
        date: "2026-07-25",
      },
    ],
  },
  {
    label: "Week 4 · Jul 28 – Aug 1",
    done: false,
    milestones: [
      {
        day: "Tue Jul 29",
        title: "Competitive bakeoff sim (Saviynt)",
        type: "Sim",
        status: "UPCOMING",
        icon: "🎭",
        date: "2026-07-29",
      },
      {
        day: "Thu Jul 31",
        title: "SailPoint IIQ Core cert exam",
        type: "Cert",
        status: "UPCOMING",
        icon: "🏆",
        date: "2026-07-31",
      },
    ],
  },
];
