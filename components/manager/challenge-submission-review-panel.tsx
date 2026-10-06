"use client";

import { Loader2, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ManagerCopilotDraft } from "@/components/manager/manager-copilot-draft";
import { ScoreBar } from "@/components/ui/bars";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { Tag } from "@/components/ui/tag";
import { isPdfEvidence } from "@/lib/evidence/evidence-file-shared";
import { cn } from "@/lib/utils";

type ChallengeBrief = {
  title: string;
  description: string | null;
  steps: string[];
  successCriteria: string[];
  linkedSolutions: string[];
  linkedResources: string[];
  competencyNames: string[];
  estimatedMinutes: number;
  difficulty: string;
  targetLevel: string | null;
};

type ChallengeDetailResponse = {
  submission: {
    id: string;
    reflectionText: string | null;
    submittedAt: string | null;
    status: string;
  };
  personName: string;
  challenge: ChallengeBrief & { id: string };
  evidence: Array<{
    label: string;
    href: string | null;
    kind: "image" | "file" | "link";
    unavailable?: boolean;
    openUrl: string;
  }>;
  aiReview: {
    score: number;
    suggestedGrade: number;
    summary: string;
    strengths: string[];
    gaps: string[];
    evidenceNotes: string;
    source: string;
  } | null;
};

function scoreTone(score: number): { label: string; pill: StatusTone; text: string } {
  if (score >= 80) return { label: "Strong", pill: "success", text: "text-blue" };
  if (score >= 70) return { label: "Developing", pill: "blue", text: "text-blue" };
  if (score >= 60) return { label: "Below target", pill: "warning", text: "text-warning" };
  return { label: "Below target", pill: "danger", text: "text-danger" };
}

const SECTION_TITLE = "label-caps mb-2 block";

function BriefSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className={SECTION_TITLE}>{label}</h3>
      {children}
    </section>
  );
}

function TagList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item}>
          <Tag>{item}</Tag>
        </li>
      ))}
    </ul>
  );
}

function ChallengeBriefModal({ challenge, onClose }: { challenge: ChallengeBrief; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Close challenge brief"
        className="absolute inset-0 bg-ink/45"
        onClick={onClose}
        type="button"
      />
      <div
        aria-labelledby="challenge-brief-title"
        aria-modal="true"
        className="relative flex min-h-0 max-h-[min(85vh,720px)] w-full max-w-xl flex-col overflow-hidden rounded-[14px] border border-line bg-white"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-3 border-b border-divider px-5 py-4">
          <div className="min-w-0">
            <p className="label-caps label-caps--blue">Challenge brief</p>
            <h2 className="mt-1 text-[22px] leading-tight font-extrabold tracking-[-0.015em] text-ink" id="challenge-brief-title">
              {challenge.title}
            </h2>
          </div>
          <button
            aria-label="Close"
            className="rounded-full p-1.5 text-muted hover:bg-divider hover:text-ink"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 pb-5">
          <p className="text-[13px] text-muted">
            {[
              `${challenge.estimatedMinutes} minutes`,
              challenge.targetLevel ? `${challenge.targetLevel} level` : null,
              challenge.difficulty || null,
            ]
              .filter(Boolean)
              .join(", ")}
          </p>
          {challenge.description ? (
            <BriefSection label="Overview">
              <p className="text-[15px] leading-normal text-ink-2">{challenge.description}</p>
            </BriefSection>
          ) : null}
          {challenge.steps.length > 0 ? (
            <BriefSection label="Steps">
              <ol className="list-decimal space-y-1.5 pl-5 text-[15px] leading-normal text-ink-2 marker:text-muted">
                {challenge.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </BriefSection>
          ) : null}
          {challenge.successCriteria.length > 0 ? (
            <BriefSection label="Success criteria">
              <ul className="list-disc space-y-1 pl-5 text-[15px] leading-normal text-ink-2 marker:text-line-strong">
                {challenge.successCriteria.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </BriefSection>
          ) : null}
          {challenge.linkedSolutions.length > 0 ? (
            <BriefSection label="Linked solutions">
              <TagList items={challenge.linkedSolutions} />
            </BriefSection>
          ) : null}
          {challenge.competencyNames.length > 0 ? (
            <BriefSection label="Competencies">
              <TagList items={challenge.competencyNames} />
            </BriefSection>
          ) : null}
          {challenge.linkedResources.length > 0 ? (
            <BriefSection label="Resources">
              <ul className="space-y-1.5">
                {challenge.linkedResources.map((resource) => (
                  <li className="min-w-0 break-all" key={resource}>
                    <a className="link text-sm" href={resource} rel="noreferrer" target="_blank">
                      {resource.replace(/^https?:\/\//, "")}
                    </a>
                  </li>
                ))}
              </ul>
            </BriefSection>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function openEvidence(item: ChallengeDetailResponse["evidence"][number], submissionId: string, index: number) {
  const url = item.href ?? `/api/reviews/submissions/${submissionId}/evidence?index=${index}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function ChallengeSubmissionReviewPanel({
  submissionId,
  onSuggestedGrade,
  onAppendMoment,
  onDraft,
}: {
  submissionId: string;
  /** Kept for callers; the panel loads its own title with the submission. */
  challengeTitle: string;
  onSuggestedGrade?: (grade: number) => void;
  onAppendMoment?: (text: string) => void;
  onDraft?: (text: string) => void;
}) {
  const [detail, setDetail] = useState<ChallengeDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBrief, setShowBrief] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetch(`/api/reviews/submissions/${submissionId}/detail`)
      .then(async (response) => {
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Could not load submission.");
        }
        return response.json() as Promise<ChallengeDetailResponse>;
      })
      .then((body) => {
        if (cancelled) return;
        setDetail(body);
        if (body.aiReview?.suggestedGrade && onSuggestedGrade) {
          onSuggestedGrade(body.aiReview.suggestedGrade);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [submissionId, onSuggestedGrade]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-muted" role="status">
        <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
        Loading challenge proof and AI assessment
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="rounded-[14px] bg-danger-soft px-4 py-3 text-sm font-semibold text-danger" role="alert">
        {error ?? "Submission details unavailable."}
      </div>
    );
  }

  const tone = detail.aiReview ? scoreTone(detail.aiReview.score) : null;

  return (
    <>
      {showBrief ? (
        <ChallengeBriefModal challenge={detail.challenge} onClose={() => setShowBrief(false)} />
      ) : null}

      <div className="min-w-0 space-y-6">
        {detail.aiReview && tone ? (
          <section className="space-y-3">
            <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
              <div className="flex flex-col gap-1">
                <span className="label-caps">AI initial score</span>
                <span className={cn("num text-[44px] leading-none font-extrabold tracking-[-0.03em]", tone.text)}>
                  {detail.aiReview.score}
                  <span className="ml-1 text-[15px] font-semibold tracking-normal text-muted">of 100</span>
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="label-caps">Suggested grade</span>
                <span className="num text-[44px] leading-none font-extrabold tracking-[-0.03em] text-ink">
                  {detail.aiReview.suggestedGrade}
                  <span className="ml-1 text-[15px] font-semibold tracking-normal text-muted">of 5</span>
                </span>
              </div>
              <StatusPill className="pb-1" tone={tone.pill}>
                {tone.label}
              </StatusPill>
            </div>
            <ScoreBar value={detail.aiReview.score} />
          </section>
        ) : null}
        <button className="btn-secondary" onClick={() => setShowBrief(true)} type="button">
          View challenge brief
        </button>

        {detail.aiReview?.summary ? (
          <section>
            <h3 className={SECTION_TITLE}>AI assessment</h3>
            <p className="text-[15px] leading-normal text-ink-2">{detail.aiReview.summary}</p>
            {detail.aiReview.evidenceNotes ? (
              <p className="mt-2 text-sm text-muted">{detail.aiReview.evidenceNotes}</p>
            ) : null}
            <p className="mt-2 text-[13px] text-muted">Check it against the evidence before you approve.</p>
          </section>
        ) : null}

        {detail.submission.reflectionText ? (
          <section>
            <h3 className={SECTION_TITLE}>Their reflection</h3>
            <blockquote className="border-l-2 border-line-strong pl-4 text-[15px] leading-normal text-ink-2">
              {detail.submission.reflectionText}
            </blockquote>
          </section>
        ) : null}

        <section>
          <h3 className={SECTION_TITLE}>
            Submitted proof <span className="num">{detail.evidence.length}</span>
          </h3>
          {detail.evidence.length === 0 ? (
            <p className="rounded-[14px] bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
              No evidence attached. Ask the SE to resubmit with screenshots, exports or workflow artifacts.
            </p>
          ) : (
            <ul className="overflow-hidden rounded-[14px] border border-line bg-white">
              {detail.evidence.map((item, index) => (
                <li className="border-b border-divider p-3 last:border-b-0" key={`${item.label}-${index}`}>
                  {item.unavailable ? (
                    <p className="text-sm font-semibold text-danger">
                      {item.label} is missing from storage. Ask the SE to re-upload it.
                    </p>
                  ) : item.kind === "image" && item.href ? (
                    <button
                      aria-label={`Open ${item.label} in new tab`}
                      className="block w-full text-left"
                      onClick={() => openEvidence(item, submissionId, index)}
                      type="button"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt={item.label}
                        className="max-h-[280px] w-full rounded-[10px] border border-line bg-ink object-contain"
                        src={item.href}
                      />
                    </button>
                  ) : isPdfEvidence(item) && item.href ? (
                    <div className="space-y-2">
                      <iframe
                        className="h-[360px] w-full rounded-[10px] border border-line bg-white"
                        src={item.href}
                        title={item.label}
                      />
                      <button
                        className="link text-sm"
                        onClick={() => openEvidence(item, submissionId, index)}
                        type="button"
                      >
                        Open {item.label} in a new tab
                      </button>
                    </div>
                  ) : (
                    <button
                      className="link text-left text-sm"
                      onClick={() => openEvidence(item, submissionId, index)}
                      type="button"
                    >
                      Open {item.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {detail.aiReview && (detail.aiReview.strengths.length > 0 || detail.aiReview.gaps.length > 0) ? (
          <div className="space-y-5">
            <section>
              <h3 className={SECTION_TITLE}>AI strengths</h3>
              <ul className="list-disc space-y-1 pl-5 text-[15px] leading-normal text-ink-2 marker:text-line-strong">
                {detail.aiReview.strengths.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
            <section>
              <h3 className={SECTION_TITLE}>AI gaps to validate</h3>
              <ul className="overflow-hidden rounded-[14px] border border-line bg-white">
                {detail.aiReview.gaps.map((gap) => (
                  <li className="border-b border-divider last:border-b-0" key={gap}>
                    <button
                      className="flex w-full items-start gap-2.5 px-4 py-3 text-left text-[15px] leading-normal text-ink-2 transition-colors hover:bg-blue-soft"
                      onClick={() => onAppendMoment?.(gap)}
                      type="button"
                    >
                      <Plus aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-blue" />
                      <span>{gap}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : null}

        {onDraft ? (
          <ManagerCopilotDraft
            context={`Challenge: ${detail.challenge.title}\nReflection: ${detail.submission.reflectionText ?? ""}\nSuccess criteria: ${detail.challenge.successCriteria.join("; ")}`}
            gaps={detail.aiReview?.gaps}
            managerSummary={detail.aiReview?.summary}
            onDraft={onDraft}
            strengths={detail.aiReview?.strengths}
          />
        ) : null}
      </div>
    </>
  );
}
