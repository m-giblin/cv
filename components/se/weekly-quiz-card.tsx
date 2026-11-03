import Link from "next/link";
import type { MixStatus } from "@/lib/question-bank/data";
import { MIX_LENGTH, MIX_PASS_MARK } from "@/lib/question-bank/model";

/**
 * Today: the weekly quiz until it's passed. Not taken yet, or taken and under the pass mark, it
 * stays here; once passed it's gone until Monday.
 */
export function WeeklyQuizCard({ status }: { status: MixStatus | null }) {
  if (!status?.questions || status.thisWeek?.passed) return null;
  const below = status.thisWeek;
  return (
    <section
      aria-labelledby="weekly-quiz"
      className="flex flex-wrap items-center gap-4 rounded-[14px] border border-signal bg-signal-soft px-[22px] py-4"
    >
      <div className="min-w-0 flex-1">
        <p className="label-caps m-0">This week</p>
        <h2 className="m-0 text-[18px] font-extrabold text-ink" id="weekly-quiz">
          {below ? `Your weekly quiz: ${below.best}%. You need ${MIX_PASS_MARK}% to pass.` : "Your weekly quiz is ready"}
        </h2>
        <p className="m-0 text-sm text-ink-2">
          {below
            ? "Take a new set of questions. Your best score this week is the one that counts."
            : `${MIX_LENGTH} questions from across the question bank. Pass with ${MIX_PASS_MARK}% or more.`}
        </p>
      </div>
      <Link className="btn-primary shrink-0 no-underline" href="/practice/quizzes?source=mix">
        {below ? "Try again" : "Start"}
      </Link>
    </section>
  );
}
