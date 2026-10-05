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
    return (
      <div
        className="rounded-[14px] border-[1.5px] border-dashed border-line-strong p-7 text-center text-[15px] text-muted"
        role="status"
      >
        Loading your plan calendar…
      </div>
    );
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
