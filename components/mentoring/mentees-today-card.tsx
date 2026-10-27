"use client";

import { useEffect, useState } from "react";
import { MenteesCard } from "@/components/mentoring/mentees-card";
import type { TodayMentee } from "@/lib/mentoring/today-mentees";

/** "You're mentoring" on a manager's Today, for managers and admins who also mentor. Hidden when empty. */
export function MenteesTodayCard() {
  const [mentees, setMentees] = useState<TodayMentee[]>([]);
  useEffect(() => {
    fetch("/api/me/mentees")
      .then((response) => (response.ok ? response.json() : { mentees: [] }))
      .then((body: { mentees?: TodayMentee[] }) => setMentees(body.mentees ?? []))
      .catch(() => setMentees([]));
  }, []);
  return mentees.length ? <MenteesCard mentees={mentees} /> : null;
}
