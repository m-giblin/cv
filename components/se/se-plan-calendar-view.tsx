"use client";

import { useEffect, useState } from "react";
import { PlanCalendarPage } from "@/components/se/plan-calendar/PlanCalendarPage";
import type { SePlanCalendarPayload } from "@/lib/se/fetch-se-plan-calendar";

export function SePlanCalendarView({ initial }: { initial?: SePlanCalendarPayload }) {
  const [calendar, setCalendar] = useState<SePlanCalendarPayload | null>(initial ?? null);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/plan-calendar")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: SePlanCalendarPayload | null) => {
        if (!cancelled && payload) {
          setCalendar(payload);
        }
      })
      .catch(() => {
        /* keep initial/demo payload */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!calendar) {
    return null;
  }

  return (
    <PlanCalendarPage
      month={calendar.month}
      monthLabel={calendar.monthLabel}
      weeks={calendar.weeks}
      year={calendar.year}
    />
  );
}
