"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "dp_approved";

export function useApprovedPlans() {
  const [approved, setApproved] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setApproved(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  function approvePlan(seId: string) {
    setApproved((prev) => {
      const updated = { ...prev, [seId]: true };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        /* ignore quota errors */
      }
      return updated;
    });
  }

  function approveAll(seIds: string[]) {
    setApproved((prev) => {
      const updated = { ...prev, ...Object.fromEntries(seIds.map((id) => [id, true])) };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        /* ignore quota errors */
      }
      return updated;
    });
  }

  return { approved, approvePlan, approveAll };
}
