"use client";

import { useEffect, useState } from "react";
import type { StepFeedback } from "@/lib/mentoring/mentor-records-model";

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Feedback the mentee's mentor left on this step. Renders nothing until there is some. */
export function MentorFeedbackForStep({ assignmentStepId, leading = false }: { assignmentStepId?: string; leading?: boolean }) {
  const [feedback, setFeedback] = useState<StepFeedback[]>([]);

  useEffect(() => {
    if (!assignmentStepId) return;
    let cancelled = false;
    void fetch(`/api/mentor/step-feedback?assignmentStepId=${encodeURIComponent(assignmentStepId)}`)
      .then((response) => (response.ok ? response.json() : { feedback: [] }))
      .then((body: { feedback?: StepFeedback[] }) => {
        if (!cancelled) setFeedback(body.feedback ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [assignmentStepId]);

  if (feedback.length === 0) return null;
  return (
    <section className={`${leading ? "" : "mt-6 "}flex max-w-[680px] flex-col gap-3 rounded-[14px] border border-blue bg-white p-[18px]`}>
      <h2 className="text-xl font-extrabold text-ink">{leading ? "What your mentor asked" : "From your mentor"}</h2>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {feedback.map((item) => (
          <li className="rounded-[10px] bg-bg p-3" key={item.id}>
            <p className="text-[13px] text-muted">
              {item.authorName}, {shortDate(item.createdAt)}
            </p>
            <p className="whitespace-pre-wrap text-[15px] text-ink-2">{item.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
