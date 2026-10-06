"use client";

import { useEffect, useState } from "react";

function partOfDay(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** "Good morning, Priya." in the viewer's own time zone (the server can't know it). */
export function Greeting({ firstName }: { firstName: string }) {
  const [part, setPart] = useState("Hello");
  useEffect(() => {
    setPart(partOfDay(new Date().getHours()));
  }, []);
  return (
    <>
      {part}, {firstName}.
    </>
  );
}
