import type { HiringBrief } from "@/lib/mentoring/mentor-records-model";

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** The manager's hiring brief, read-only, on the mentor's view of the mentee. */
export function HiringBriefCard({ brief, firstName }: { brief: HiringBrief | null; firstName: string }) {
  if (!brief) {
    return (
      <section className="rounded-[14px] border border-line bg-white p-4">
        <h3 className="text-[15px] font-bold text-ink">Hiring brief</h3>
        <p className="mt-1 text-sm text-muted">
          No brief yet. {firstName}&apos;s manager adds it from their team page: who they hired, and what the interview left
          open. It shows up here.
        </p>
      </section>
    );
  }
  return (
    <section className="flex flex-col gap-2 rounded-[14px] border border-line bg-white p-4">
      <h3 className="text-[15px] font-bold text-ink">Hiring brief</h3>
      <p className="text-[13px] text-muted">
        From {brief.authorName}, {shortDate(brief.createdAt)}
      </p>
      <p className="whitespace-pre-wrap text-[15px] text-ink-2">{brief.background}</p>
      <p className="text-[15px] text-ink">
        <span className="font-bold">Watch for: </span>
        {brief.watchFor}
      </p>
    </section>
  );
}
