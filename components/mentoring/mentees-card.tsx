import Link from "next/link";
import type { TodayMentee } from "@/lib/mentoring/today-mentees";
import { formatDay } from "@/lib/se/ramp-model";

/** People this SE mentors. Until the schedule is set, the next move is to read the brief and meet them. */
export function MenteesCard({ mentees }: { mentees: TodayMentee[] }) {
  return (
    <section className="rounded-[14px] border border-line bg-white p-5 shadow-[var(--shadow-card)]">
      <h2 className="text-lg font-extrabold text-ink">You&apos;re mentoring</h2>
      <ul className="mt-3 flex flex-col divide-y divide-divider">
        {mentees.map((mentee) => (
          <li className="flex flex-wrap items-center justify-between gap-3 py-3" key={`${mentee.menteeId}-${mentee.planName}`}>
            <span className="min-w-0">
              <span className="block font-bold text-ink">{mentee.name}</span>
              <span className="block text-sm text-muted">
                {mentee.planName}
                {mentee.startDate ? `, started ${formatDay(mentee.startDate)}` : ""}
              </span>
              <span className="mt-1 block text-sm text-ink-2">
                {mentee.waitingOnReview > 0
                  ? `${mentee.waitingOnReview} ${mentee.waitingOnReview === 1 ? "step is" : "steps are"} waiting on your review.`
                  : mentee.scheduleSet
                    ? `Schedule set. Last step due ${formatDay(mentee.targetCompletion) ?? "soon"}.`
                    : mentee.nextOneOnOneLabel
                      ? "Next: read the hiring brief before your 1:1, then set the schedule together."
                      : `Next: read the hiring brief, meet ${mentee.name.split(" ")[0]}, then set the schedule together.`}
              </span>
              {mentee.nextOneOnOneLabel ? (
                <span className="mt-1 block text-sm font-bold text-blue">1:1 booked {mentee.nextOneOnOneLabel}</span>
              ) : null}
            </span>
            <Link
              className={mentee.waitingOnReview > 0 || !mentee.scheduleSet ? "btn-primary" : "btn-secondary"}
              href={`/mentoring?open=${mentee.assignmentId}${mentee.waitingOnReview > 0 ? "&step=review" : ""}`}
            >
              {mentee.waitingOnReview > 0 ? "Review" : mentee.scheduleSet ? "Open workbench" : "Read the brief"}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
