import type { MyMentor } from "@/lib/mentoring/my-mentor";

function day(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** Who mentors the new hire and what they've agreed so far, so the relationship is visible from day one. */
export function MyMentorCard({
  mentor,
  firstMeeting = null,
}: {
  mentor: MyMentor;
  /** The next booked 1:1 the mentor is invited to, as the scheduler wrote it, so the card doesn't promise one. */
  firstMeeting?: string | null;
}) {
  const first = mentor.profile.fullName.split(" ")[0] ?? mentor.profile.fullName;
  const scheduled = day(mentor.scheduleSetAt);
  const lastMet = day(mentor.lastCheckinAt);
  return (
    <section className="flex flex-col gap-2 rounded-[14px] border border-line bg-white px-[22px] py-5">
      <h2 className="label-caps">Your mentor</h2>
      <p className="text-lg font-extrabold text-ink">{mentor.profile.fullName}</p>
      <a className="link self-start text-sm" href={`mailto:${mentor.profile.email}`}>
        {mentor.profile.email}
      </a>
      <ul className="m-0 mt-1 flex list-none flex-col gap-1 p-0 text-sm text-ink-2">
        <li>
          {lastMet
            ? `Last 1:1 ${lastMet}.`
            : firstMeeting
              ? `Your first 1:1 with ${first} is ${firstMeeting}.`
              : `${first} will set up your first 1:1.`}
        </li>
        <li>
          {scheduled
            ? lastMet
              ? `${first} set your schedule ${scheduled}. The due dates on your ramp are the ones you agreed.`
              : `${first} drafted your due dates ${scheduled}. You'll confirm them together at your first 1:1.`
            : lastMet
              ? `${first} hasn't set the dates for this stage yet. You'll agree them at your next 1:1.`
              : `You'll agree your due dates with ${first} at your first 1:1.`}
        </li>
        <li>{first} reviews your steps and runs your test-outs. Your manager signs off each stage gate.</li>
      </ul>
    </section>
  );
}
