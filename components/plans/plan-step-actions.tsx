"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { toast } from "sonner";
import { CorpusFeedbackWidget } from "@/components/corpus/corpus-feedback-widget";
import { TextArea, TextInput } from "@/components/admin/admin-ui";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusPill } from "@/components/ui/status-pill";
import { PlanStep } from "@/lib/types";
import { cn } from "@/lib/utils";

/** "Done when" self-check criteria per step type. Local to the view; they never gate the API submit. */
const DONE_WHEN: Record<string, string[]> = {
  content_review: [
    "Resource opened and worked through end to end",
    "Key takeaways summarised for your reviewer",
    "Open questions noted for your next 1:1",
  ],
  shadow_meeting_log: [
    "Shadowed the full customer call",
    "Observations and key takeaways logged",
    "One technique you will reuse noted",
  ],
  deal_prep: [
    "Account-specific deal prep brief generated",
    "Discovery questions and likely objections reviewed",
    "Brief saved (this submits the step)",
  ],
  adhoc: ["Task work completed", "Summary written for your manager's live validation"],
  mentor_review: ["Topic chosen for the mentor discussion", "Review requested from your mentor"],
  default: ["Activity completed in the practice tool", "Result ready for manager or mentor validation"],
};

const H2_CLS = "text-xl font-extrabold text-ink";
const LABEL_CLS = "text-sm font-bold text-ink";
const NOTE_CLS = "text-[13px] text-muted";
const EVIDENCE_CLS = "flex flex-col gap-3 rounded-[14px] border border-line bg-white p-[18px]";

function DoneWhen({ criteria }: { criteria: string[] }) {
  const groupId = useId();
  const [checked, setChecked] = useState<boolean[]>(() => criteria.map(() => false));
  const count = checked.filter(Boolean).length;

  return (
    <fieldset className="flex max-w-[680px] flex-col gap-2.5">
      <legend className="mb-2.5 flex w-full items-baseline justify-between gap-3">
        <span className={H2_CLS}>Done when</span>
        <span aria-live="polite" className="num text-[13px] font-semibold text-muted" role="status">
          {count} of {criteria.length} checked
        </span>
      </legend>
      {criteria.map((text, index) => {
        const on = checked[index] ?? false;
        const id = `${groupId}-${index}`;
        return (
          <label
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-[12px] border px-4 py-3 text-[15px] text-ink",
              on ? "border-blue bg-blue-soft" : "border-line bg-white",
            )}
            htmlFor={id}
            key={text}
          >
            <Checkbox
              checked={on}
              id={id}
              onChange={(event) => {
                const next = [...checked];
                next[index] = event.target.checked;
                setChecked(next);
              }}
            />
            <span>{text}</span>
          </label>
        );
      })}
    </fieldset>
  );
}

function StepIntro({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return <p className="max-w-[680px] text-base leading-[1.55] text-ink-2">{children}</p>;
}

export function PlanStepActions({
  step,
  mentorName,
}: {
  step: PlanStep;
  mentorName?: string;
}) {
  const router = useRouter();
  const fieldId = useId();
  const [isSaving, setIsSaving] = useState(false);
  const [shadowNotes, setShadowNotes] = useState("");
  const [mentorTopic, setMentorTopic] = useState("");
  const [contentNotes, setContentNotes] = useState("");

  const awaitingReview = step.status === "submitted";
  const needsRevision = step.status === "in_progress" && Boolean(step.description);
  const reviewerNote = mentorName
    ? `Your manager or ${mentorName} validates this step after you submit.`
    : "Your manager or mentor validates this step after you submit.";

  if (step.locked) {
    return (
      <div className="flex max-w-[680px] flex-col gap-2 rounded-[14px] border border-dashed border-line-strong p-5">
        <div>
          <StatusPill tone="neutral">Locked</StatusPill>
        </div>
        <p className="text-[15px] text-ink-2">
          {step.segmentIndex != null
            ? `This step is in segment ${step.segmentIndex}. Pass the gate at the end of the previous segment to unlock it.`
            : "Pass the gate at the end of the previous segment to unlock this step."}
        </p>
      </div>
    );
  }

  async function submitStep(notes?: string) {
    if (!step.assignmentStepId) {
      toast.error("This step is not linked to an active plan assignment.");
      return;
    }

    setIsSaving(true);
    const response = await fetch(`/api/plans/steps/${step.assignmentStepId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });

    if (!response.ok) {
      toast.error("Could not submit step.");
      setIsSaving(false);
      return;
    }

    toast.success("Submitted for review by your manager or mentor.");
    router.push("/my-plan");
    router.refresh();
  }

  if (awaitingReview) {
    return (
      <div className="flex max-w-[680px] flex-col gap-2 rounded-[14px] border border-line bg-white p-5" role="status">
        <div>
          <StatusPill tone="warning">With reviewer</StatusPill>
        </div>
        <p className="text-[15px] text-ink-2">
          Your work is submitted and awaiting validation from your manager or mentor. You&apos;ll be notified when
          it&apos;s approved or if you need to try again.
        </p>
      </div>
    );
  }

  if (step.type === "content_review") {
    return (
      <div className="flex flex-col gap-[22px]">
        <StepIntro>
          {needsRevision
            ? "Your manager or mentor asked you to review this again. Open the resource, then resubmit."
            : step.description}
        </StepIntro>
        <DoneWhen criteria={DONE_WHEN.content_review} />
        <section className="flex max-w-[680px] flex-col gap-2">
          <h2 className={H2_CLS}>Evidence</h2>
          <div className={EVIDENCE_CLS}>
            {step.resourceUrl ? (
              <a className="link self-start text-sm" href={step.resourceUrl} rel="noreferrer" target="_blank">
                Open resource
              </a>
            ) : (
              <p className="text-sm text-muted">Browse the resource library for related materials.</p>
            )}
            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLS} htmlFor={`${fieldId}-content-notes`}>
                What did you learn?
              </label>
              <TextArea
                className="resize-y"
                id={`${fieldId}-content-notes`}
                onChange={(e) => setContentNotes(e.target.value)}
                placeholder="Summarize key takeaways for your reviewer…"
                required
                rows={4}
                value={contentNotes}
              />
            </div>
          </div>
          <p className={NOTE_CLS}>{reviewerNote}</p>
        </section>
        <div>
          <button
            className="btn-primary"
            disabled={isSaving || contentNotes.trim().length < 10}
            onClick={() => void submitStep(contentNotes.trim())}
            type="button"
          >
            Submit for review
          </button>
        </div>
        {step.contentAssetId ? (
          <CorpusFeedbackWidget assetTitle={step.title} contentAssetId={step.contentAssetId} />
        ) : null}
      </div>
    );
  }

  if (step.type === "shadow_meeting_log") {
    return (
      <form
        className="flex flex-col gap-[22px]"
        onSubmit={async (event) => {
          event.preventDefault();
          setIsSaving(true);
          const response = await fetch("/api/shadow-logs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              assignmentStepId: step.assignmentStepId,
              notes: shadowNotes,
            }),
          });
          if (!response.ok) {
            toast.error("Could not save shadow log.");
            setIsSaving(false);
            return;
          }
          toast.success("Shadow log submitted for review.");
          router.push("/my-plan");
          router.refresh();
        }}
      >
        <StepIntro>{step.description}</StepIntro>
        <DoneWhen criteria={DONE_WHEN.shadow_meeting_log} />
        <section className="flex max-w-[680px] flex-col gap-2">
          <h2 className={H2_CLS}>Evidence</h2>
          <div className={EVIDENCE_CLS}>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLS} htmlFor={`${fieldId}-shadow-notes`}>
                Shadow meeting log
              </label>
              <TextArea
                className="resize-y"
                id={`${fieldId}-shadow-notes`}
                onChange={(e) => setShadowNotes(e.target.value)}
                placeholder="What did you observe? Key takeaways from the call…"
                required
                rows={4}
                value={shadowNotes}
              />
            </div>
          </div>
          <p className={NOTE_CLS}>{reviewerNote}</p>
        </section>
        <div>
          <button className="btn-primary" disabled={isSaving} type="submit">
            Submit for review
          </button>
        </div>
      </form>
    );
  }

  if (step.type === "deal_prep") {
    const prepHref = step.assignmentStepId
      ? `/practice/deal-prep?step=${step.assignmentStepId}`
      : "/practice/deal-prep";

    return (
      <div className="flex flex-col gap-[22px]">
        <StepIntro>
          {step.description ||
            "Generate an account-specific deal prep brief. Saving the brief submits this step for manager review."}
        </StepIntro>
        <DoneWhen criteria={DONE_WHEN.deal_prep} />
        <section className="flex max-w-[680px] flex-col gap-2">
          <h2 className={H2_CLS}>Evidence</h2>
          <div className={EVIDENCE_CLS}>
            <p className="text-sm text-ink-2">
              Your saved deal prep brief is attached automatically and submits this step for review.
            </p>
          </div>
          <p className={NOTE_CLS}>{reviewerNote}</p>
        </section>
        <div>
          <Link className="btn-primary" href={prepHref}>
            Open deal prep
          </Link>
        </div>
      </div>
    );
  }

  if (step.type === "custom" && step.assignmentStepId?.startsWith("adhoc-")) {
    return (
      <form
        className="flex flex-col gap-[22px]"
        onSubmit={async (event) => {
          event.preventDefault();
          setIsSaving(true);
          const response = await fetch(`/api/plans/steps/${step.assignmentStepId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notes: contentNotes.trim() }),
          });
          if (!response.ok) {
            toast.error("Could not submit task.");
            setIsSaving(false);
            return;
          }
          toast.success("Submitted for manager sign-off.");
          router.push("/my-plan");
          router.refresh();
        }}
      >
        <StepIntro>
          {step.description || "Your manager assigned this task. Do the work, then submit it for your manager to sign off live."}
        </StepIntro>
        <DoneWhen criteria={DONE_WHEN.adhoc} />
        <section className="flex max-w-[680px] flex-col gap-2">
          <h2 className={H2_CLS}>Evidence</h2>
          <div className={EVIDENCE_CLS}>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLS} htmlFor={`${fieldId}-task-notes`}>
                What did you complete?
              </label>
              <TextArea
                className="resize-y"
                id={`${fieldId}-task-notes`}
                onChange={(e) => setContentNotes(e.target.value)}
                placeholder="Summarize for your manager's live validation…"
                required
                rows={4}
                value={contentNotes}
              />
            </div>
          </div>
          <p className={NOTE_CLS}>Your manager signs off this task live.</p>
        </section>
        <div>
          <button className="btn-primary" disabled={isSaving || contentNotes.trim().length < 10} type="submit">
            Submit for manager sign-off
          </button>
        </div>
      </form>
    );
  }

  if (step.type === "mentor_review") {
    return (
      <form
        className="flex flex-col gap-[22px]"
        onSubmit={async (event) => {
          event.preventDefault();
          setIsSaving(true);
          const response = await fetch("/api/mentor-reviews", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              assignmentStepId: step.assignmentStepId,
              topic: mentorTopic,
            }),
          });
          if (!response.ok) {
            toast.error("Could not request mentor review.");
            setIsSaving(false);
            return;
          }
          toast.success("Submitted for mentor review.");
          router.push("/my-plan");
          router.refresh();
        }}
      >
        <StepIntro>{mentorName ? `Your mentor: ${mentorName}` : step.description}</StepIntro>
        <DoneWhen criteria={DONE_WHEN.mentor_review} />
        <section className="flex max-w-[680px] flex-col gap-2">
          <h2 className={H2_CLS}>Request mentor review</h2>
          <div className={EVIDENCE_CLS}>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLS} htmlFor={`${fieldId}-mentor-topic`}>
                Topic for mentor discussion
              </label>
              <TextInput
                id={`${fieldId}-mentor-topic`}
                onChange={(e) => setMentorTopic(e.target.value)}
                required
                value={mentorTopic}
              />
            </div>
          </div>
          <p className={NOTE_CLS}>{mentorName ? `${mentorName} reviews this step.` : reviewerNote}</p>
        </section>
        <div>
          <button className="btn-primary" disabled={isSaving} type="submit">
            Submit for mentor review
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-[22px]">
      <StepIntro>Complete the activity, then your manager or mentor validates it.</StepIntro>
      <DoneWhen criteria={DONE_WHEN.default} />
      <section className="flex max-w-[680px] flex-col gap-2">
        <h2 className={H2_CLS}>Evidence</h2>
        <div className={EVIDENCE_CLS}>
          <p className="text-sm text-ink-2">Your result from the practice tool is attached automatically.</p>
        </div>
        <p className={NOTE_CLS}>{reviewerNote}</p>
      </section>
      <div>
        <Link className="btn-primary" href={stepLinkForType(step.type)}>
          Continue
        </Link>
      </div>
    </div>
  );
}

function stepLinkForType(type: PlanStep["type"]) {
  switch (type) {
    case "challenge":
      return "/practice/challenges";
    case "simulation":
      return "/practice/simulations";
    case "deal_prep":
      return "/practice/deal-prep";
    default:
      return "/dashboard";
  }
}
