import Link from "next/link";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { requireUserPageAccess } from "@/lib/auth/require-access";

export const metadata = { title: "Mentor guide · Mentoring" };

const CARD_CLS = "flex flex-col gap-3 rounded-[14px] border border-line bg-white p-6";

const ROLE = [
  {
    title: "You coach. The manager decides.",
    body: "You help your mentee learn and practise. The hiring manager approves each gate and owns dates. Your recommendations and notes are the evidence they use.",
  },
  {
    title: "Learn it before you coach it.",
    body: "Every step opens a workbench with the task, the content behind it, and a button to try it yourself. Run the simulation and take the check before your mentee does.",
  },
  {
    title: "Coach the work, not the checkbox.",
    body: "Open what they produced: simulation transcripts and scores, challenge write-ups, check attempts and pitches. Leave feedback on the step so they see it where they work.",
  },
];

const CADENCE = [
  { when: "Weekly, 30 minutes", what: "A 1:1. Use Log a 1:1: the agenda is built from what is late, waiting and due this week. End with one or two next actions." },
  { when: "Within a day", what: "Debrief anything they submit. You get a notification when they do." },
  { when: "Before each gate", what: "Send the manager your recommendation: ready, or not yet and why. Do it before the manager reviews the gate." },
  { when: "In your first meeting", what: "Agree the dates together, then use Set the schedule. The new hire and their manager are told what you set." },
  { when: "When a date stops fitting", what: "Agree a new date with them and change it on the step. It applies at once and both are notified." },
];

const STAGES = [
  {
    name: "Days 1–30: identity foundations",
    focus: "Vocabulary and the core story: what identity security is, joiner-mover-leaver, roles and access profiles, people versus non-human accounts.",
    ask: "Can they explain identity security to a new customer without naming a product?",
  },
  {
    name: "Days 31–60: platform and discovery",
    focus: "Map customer problems to Identity Security Cloud. Access requests, application onboarding, workflows, and a discovery call with no demo.",
    ask: "Do they ask about the problem before they show anything?",
  },
  {
    name: "Days 61–90: machine and agent identity",
    focus: "Machine identities, AI agents, Agentic Fabric and Credentials Management, plus the common competitive objections.",
    ask: "Can they tell a human, a machine and an agent identity apart, and say why each needs governing?",
  },
  {
    name: "Days 91–120: field readiness",
    focus: "The executive narrative, competitive conversations, deal prep and customer simulations at executive level.",
    ask: "Would you put them in front of a customer on their own next week?",
  },
];

const HABITS = [
  "Ask more than you tell. A good question teaches more than the answer does.",
  "Name one strength and one thing to change. More than that does not stick.",
  "Tie every point to a customer. 'A CISO would push back here' lands better than 'that was wrong'.",
  "Write it down. Feedback and next actions in the platform beat a hallway comment.",
  "Escalate early. If they are two steps behind or stuck on the same thing twice, tell the manager.",
];

export default async function MentorGuidePage() {
  await requireUserPageAccess("/mentoring/guide");
  return (
    <>
      <PageHeader
        accent="What a good mentor does here."
        eyebrow={
          <>
            <Link className="link normal-case tracking-normal" href="/mentoring">
              Mentoring
            </Link>
            &nbsp;/&nbsp;Guide
          </>
        }
        subtitle="Your role, the rhythm that works, and what to look for in each stage of the new-hire program."
        title="Mentor guide."
      />
      <PageBody className="flex max-w-[1020px] flex-col gap-6 pb-10">
        <section className="grid gap-3 md:grid-cols-3">
          {ROLE.map((item) => (
            <article className={CARD_CLS} key={item.title}>
              <h2 className="text-lg font-extrabold text-ink">{item.title}</h2>
              <p className="text-[15px] text-ink-2">{item.body}</p>
            </article>
          ))}
        </section>

        <section className={CARD_CLS}>
          <h2 className="text-xl font-extrabold text-ink">The rhythm</h2>
          <dl className="m-0 grid gap-x-6 gap-y-3 sm:grid-cols-[200px_1fr]">
            {CADENCE.map((item) => (
              <div className="contents" key={item.when}>
                <dt className="font-bold text-ink">{item.when}</dt>
                <dd className="m-0 text-[15px] text-ink-2">{item.what}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-extrabold text-ink">The four stages</h2>
          <p className="text-[15px] text-ink-2">
            Each stage is 30 days and ends with a gate the manager approves. Approval opens the next stage. On the Mentoring
            page, open a mentee and use The full path to look ahead at any stage and try its steps yourself.
          </p>
          <ol className="m-0 grid list-none gap-3 p-0 md:grid-cols-2">
            {STAGES.map((stage) => (
              <li className={CARD_CLS} key={stage.name}>
                <h3 className="text-lg font-extrabold text-ink">{stage.name}</h3>
                <p className="text-[15px] text-ink-2">{stage.focus}</p>
                <p className="text-[15px] text-ink">
                  <span className="font-bold">The question to answer: </span>
                  {stage.ask}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className={CARD_CLS}>
          <h2 className="text-xl font-extrabold text-ink">Habits that work</h2>
          <ul className="m-0 flex list-disc flex-col gap-2 pl-5 text-[15px] text-ink-2">
            {HABITS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className={CARD_CLS}>
          <h2 className="text-xl font-extrabold text-ink">What you can and cannot change</h2>
          <ul className="m-0 flex list-disc flex-col gap-2 pl-5 text-[15px] text-ink-2">
            <li>You can leave feedback on any step, log 1:1s, approve check-in requests, and recommend on gates.</li>
            <li>You set the due dates with the new hire. They are not fixed to 30 days; the stage ends on the latest one. The new hire and manager are notified.</li>
            <li>The manager writes the hiring brief, approves gates, and edits the program itself. You read the brief; you do not edit it.</li>
          </ul>
        </section>
      </PageBody>
    </>
  );
}
