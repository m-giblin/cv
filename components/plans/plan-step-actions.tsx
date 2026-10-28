"use client";

import { useUnsavedChanges } from "@/components/ui/drawer";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { CorpusFeedbackWidget } from "@/components/corpus/corpus-feedback-widget";
import { TextArea, TextInput } from "@/components/admin/admin-ui";
import { Checkbox } from "@/components/ui/checkbox";
import { Modal } from "@/components/ui/modal";
import { StatusPill } from "@/components/ui/status-pill";
import { isPitchStep, PITCH_STEP_DONE_WHEN, pitchStudioHref, type AttachedPitch } from "@/lib/pitch/pitch-step";
import { MIN_EVIDENCE_CHARS, submitReviewerName, uncheckedNote } from "@/lib/plans/step-submit-copy";
import { PlanStep } from "@/lib/types";
import { cn } from "@/lib/utils";
import { planStepActionLabel, planStepHref } from "@/lib/utils/plan-links";

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
  knowledge_check: ["Check opened from this step", "Score at or above the pass mark"],
  playbook: ["Chapter opened from this step", "Chapter read through to the end"],
  default: ["Activity completed in the practice tool", "Result ready for manager or mentor validation"],
};

const H2_CLS = "text-xl font-extrabold text-ink";
const LABEL_CLS = "text-sm font-bold text-ink";
const NOTE_CLS = "text-[13px] text-muted";
const EVIDENCE_CLS = "flex flex-col gap-3 rounded-[14px] border border-line bg-white p-[18px]";

function DoneWhen({ criteria, onCountChange }: { criteria: string[]; onCountChange?: (count: number) => void }) {
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
                onCountChange?.(next.filter(Boolean).length);
              }}
            />
            <span>{text}</span>
          </label>
        );
      })}
    </fieldset>
  );
}

/** Under a disabled submit: why it can't be pressed yet. */
function SubmitHint({ show, text = "Write at least a sentence for your reviewer." }: { show: boolean; text?: string }) {
  if (!show) return null;
  return <p className="mt-2 text-[13px] text-muted">{text}</p>;
}

/** Shown before submitting when some Done-when boxes are unticked. A nudge, never a block. */
function SubmitConfirm({
  pending,
  checked,
  total,
  reviewer,
  onCancel,
  onConfirm,
}: {
  pending: boolean;
  checked: number;
  total: number;
  reviewer: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  return (
    <Modal height="auto" labelledBy={titleId} onClose={onCancel} open={pending} width={460}>
      <div className="flex flex-col gap-3 p-6">
        <h2 className={H2_CLS} id={titleId}>
          Submit for review?
        </h2>
        <p className="text-[15px] text-ink-2">{uncheckedNote(checked, total, reviewer)}</p>
        <div className="mt-2 flex flex-wrap justify-end gap-2">
          <button className="btn-secondary" onClick={onCancel} type="button">
            Keep working
          </button>
          <button className="btn-primary" onClick={onConfirm} type="button">
            Submit anyway
          </button>
        </div>
      </div>
    </Modal>
  );
}

/** The pitch saved to this step in Pitch Studio. */
function AttachedPitchCard({ pitch }: { pitch: AttachedPitch }) {
  return (
    <div className="flex flex-col gap-2 rounded-[12px] border border-line bg-bg p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-bold text-ink">
          {pitch.responseMode === "text" ? "Typed pitch" : pitch.responseMode === "voice" ? "Voice pitch" : "Video pitch"} attached
        </span>
        <span className="num text-[13px] text-muted">
          {pitch.score !== null ? `AI score ${pitch.score}` : "Not scored"} · {pitch.words} words
        </span>
      </div>
      {pitch.snippet ? <p className="text-[14px] leading-[1.5] text-ink-2">&ldquo;{pitch.snippet}&rdquo;</p> : null}
      {pitch.coachingNote ? <p className="text-[13px] text-muted">Coaching note: {pitch.coachingNote}</p> : null}
    </div>
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
  const [checkedCount, setCheckedCount] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const pendingSubmit = useRef<(() => void) | null>(null);
  const pitchStep = isPitchStep(step);
  const [attachedPitch, setAttachedPitch] = useState<AttachedPitch | null>(null);
  useUnsavedChanges(Boolean(shadowNotes.trim() || mentorTopic.trim() || contentNotes.trim()));

  // A pitch step's evidence is the pitch saved to it in Pitch Studio.
  useEffect(() => {
    if (!pitchStep || !step.assignmentStepId || step.assignmentStepId.startsWith("adhoc-")) return;
    let live = true;
    void fetch(`/api/pitch/practice?assignmentStepId=${encodeURIComponent(step.assignmentStepId)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { pitch?: AttachedPitch | null } | null) => {
        if (live) setAttachedPitch(body?.pitch ?? null);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [pitchStep, step.assignmentStepId]);

  const awaitingReview = step.status === "submitted";
  const needsRevision = step.status === "in_progress" && Boolean(step.description);
  // Mentors approve everyday steps; the hiring manager signs off stage gates (see canMentorApproveStep).
  const reviewerNote = step.isSegmentGate
    ? `${mentorName ? `${mentorName} adds a recommendation, then your` : "Your"} manager signs off this gate. You can take it as soon as you're ready: once your manager signs off the stage's gates, any steps still open close as tested out and your next stage opens.`
    : mentorName
      ? `${mentorName} reviews this step after you submit.`
      : "Your manager reviews this step after you submit.";
  const reviewer = submitReviewerName({ isSegmentGate: step.isSegmentGate, mentorName });

  /** Submit now when every Done-when box is ticked; otherwise confirm first with a gentle note. */
  function confirmThenSubmit(total: number, run: () => void) {
    if (checkedCount >= total) {
      run();
      return;
    }
    pendingSubmit.current = run;
    setConfirming(true);
  }

  const confirmDialog = (total: number) => (
    <SubmitConfirm
      checked={checkedCount}
      onCancel={() => {
        pendingSubmit.current = null;
        setConfirming(false);
      }}
      onConfirm={() => {
        setConfirming(false);
        const run = pendingSubmit.current;
        pendingSubmit.current = null;
        run?.();
      }}
      pending={confirming}
      reviewer={reviewer}
      total={total}
    />
  );

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

    toast.success(`Submitted for review by ${reviewer}.`);
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
          Your work is submitted and awaiting validation from {reviewer}. You&apos;ll be notified when it&apos;s
          approved or if you need to try again.
        </p>
        {attachedPitch ? <AttachedPitchCard pitch={attachedPitch} /> : null}
      </div>
    );
  }

  if (pitchStep) {
    const criteria = PITCH_STEP_DONE_WHEN;
    const notes = contentNotes.trim();
    // With a pitch attached the reflection is optional; without one the SE explains what they did.
    const tooShort = !attachedPitch && notes.length < MIN_EVIDENCE_CHARS;
    return (
      <div className="flex flex-col gap-[22px]">
        <StepIntro>
          {needsRevision
            ? "Your reviewer asked you to try this pitch again. Open Pitch Studio, record or type it, then resubmit."
            : step.description}
        </StepIntro>
        <DoneWhen criteria={criteria} onCountChange={setCheckedCount} />
        <section className="flex max-w-[680px] flex-col gap-2">
          <h2 className={H2_CLS}>Evidence</h2>
          <div className={EVIDENCE_CLS}>
            {attachedPitch ? (
              <AttachedPitchCard pitch={attachedPitch} />
            ) : (
              <p className="text-sm text-ink-2">
                Record or type the pitch in Pitch Studio and score it. Submitting there attaches it to this step.
              </p>
            )}
            <div>
              <Link className={attachedPitch ? "btn-secondary" : "btn-primary"} href={pitchStudioHref(step)}>
                {attachedPitch ? "Open Pitch Studio again" : "Open Pitch Studio"}
              </Link>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLS} htmlFor={`${fieldId}-pitch-notes`}>
                What would you change? <span className="font-normal text-muted">{attachedPitch ? "(optional)" : ""}</span>
              </label>
              <TextArea
                className="resize-y"
                id={`${fieldId}-pitch-notes`}
                onChange={(e) => setContentNotes(e.target.value)}
                placeholder="Your reflection for your reviewer…"
                rows={3}
                value={contentNotes}
              />
            </div>
          </div>
          <p className={NOTE_CLS}>{reviewerNote}</p>
        </section>
        <div>
          <button
            className={attachedPitch ? "btn-primary" : "btn-secondary"}
            disabled={isSaving || tooShort}
            onClick={() => confirmThenSubmit(criteria.length, () => void submitStep(notes || undefined))}
            type="button"
          >
            Submit for review
          </button>
          <SubmitHint
            show={!isSaving && tooShort}
            text="Submit from Pitch Studio to attach your pitch, or write at least a sentence for your reviewer."
          />
        </div>
        {confirmDialog(criteria.length)}
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
        <DoneWhen criteria={DONE_WHEN.content_review!} onCountChange={setCheckedCount} />
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
            disabled={isSaving || contentNotes.trim().length < MIN_EVIDENCE_CHARS}
            onClick={() => confirmThenSubmit(DONE_WHEN.content_review!.length, () => void submitStep(contentNotes.trim()))}
            type="button"
          >
            Submit for review
          </button>
          <SubmitHint show={!isSaving && contentNotes.trim().length < MIN_EVIDENCE_CHARS} />
        </div>
        {confirmDialog(DONE_WHEN.content_review!.length)}
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
        onSubmit={(event) => {
          event.preventDefault();
          confirmThenSubmit(DONE_WHEN.shadow_meeting_log!.length, () => void (async () => {
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
          })());
        }}
      >
        <StepIntro>{step.description}</StepIntro>
        <DoneWhen criteria={DONE_WHEN.shadow_meeting_log!} onCountChange={setCheckedCount} />
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
        {confirmDialog(DONE_WHEN.shadow_meeting_log!.length)}
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
        onSubmit={(event) => {
          event.preventDefault();
          confirmThenSubmit(DONE_WHEN.adhoc!.length, () => void (async () => {
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
          })());
        }}
      >
        <StepIntro>
          {step.description || "Your manager assigned this task. Do the work, then submit it for your manager to sign off live."}
        </StepIntro>
        <DoneWhen criteria={DONE_WHEN.adhoc!} onCountChange={setCheckedCount} />
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
          <button className="btn-primary" disabled={isSaving || contentNotes.trim().length < MIN_EVIDENCE_CHARS} type="submit">
            Submit for manager sign-off
          </button>
          <SubmitHint show={!isSaving && contentNotes.trim().length < MIN_EVIDENCE_CHARS} />
        </div>
        {confirmDialog(DONE_WHEN.adhoc!.length)}
      </form>
    );
  }

  if (step.type === "mentor_review") {
    return (
      <form
        className="flex flex-col gap-[22px]"
        onSubmit={(event) => {
          event.preventDefault();
          confirmThenSubmit(DONE_WHEN.mentor_review!.length, () => void (async () => {
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
              toast.success(
                step.isSegmentGate
                  ? `Submitted. ${mentorName ? `${mentorName} adds a recommendation, then your` : "Your"} manager signs it off.`
                  : "Submitted for mentor review.",
              );
              router.push("/my-plan");
              router.refresh();
          })());
        }}
      >
        <StepIntro>{mentorName ? `Your mentor: ${mentorName}` : step.description}</StepIntro>
        <DoneWhen criteria={DONE_WHEN.mentor_review!} onCountChange={setCheckedCount} />
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
          <p className={NOTE_CLS}>{mentorName && !step.isSegmentGate ? `${mentorName} reviews this step.` : reviewerNote}</p>
        </section>
        <div>
          <button className="btn-primary" disabled={isSaving} type="submit">
            {step.isSegmentGate ? "Submit for sign-off" : "Submit for mentor review"}
          </button>
        </div>
        {confirmDialog(DONE_WHEN.mentor_review!.length)}
      </form>
    );
  }

  if (step.type === "knowledge_check" || step.type === "playbook") {
    const finished = step.type === "knowledge_check" ? "Passing the check completes this step." : "Finishing the chapter completes this step.";
    return (
      <div className="flex flex-col gap-[22px]">
        <StepIntro>{step.description}</StepIntro>
        <DoneWhen criteria={DONE_WHEN[step.type]!} />
        <div>
          <Link className="btn-primary" href={planStepHref(step)}>
            {planStepActionLabel(step)}
          </Link>
        </div>
        <p className={NOTE_CLS}>{finished}</p>
      </div>
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
        <Link className="btn-primary" href={planStepHref(step)}>
          {planStepActionLabel(step)}
        </Link>
      </div>
    </div>
  );
}
