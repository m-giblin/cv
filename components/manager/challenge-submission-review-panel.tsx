"use client";

import { ExternalLink, FileText, Loader2, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ManagerCopilotDraft } from "@/components/manager/manager-copilot-draft";
import { Tag } from "@/components/ui/tag";
import { isPdfEvidence } from "@/lib/evidence/evidence-file-shared";

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

function scoreTone(score: number) {
  if (score >= 80) return { label: "Strong", symbol: "✓", tag: "success" as const, text: "text-blue" };
  if (score >= 70) return { label: "Developing", symbol: "●", tag: "blue" as const, text: "text-blue" };
  if (score >= 60) return { label: "Below target", symbol: "▲", tag: "warning" as const, text: "text-warning" };
  return { label: "Below target", symbol: "▲", tag: "danger" as const, text: "text-danger" };
}

function BriefSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="label-mono mb-1">{label}</p>
      {children}
    </section>
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
            <p className="label-mono">Challenge brief</p>
            <h2 className="text-base font-bold text-ink" id="challenge-brief-title">
              {challenge.title}
            </h2>
          </div>
          <button
            aria-label="Close"
            className="rounded-full p-1.5 text-muted hover:bg-blue-soft hover:text-ink"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 pb-5">
          <p className="font-mono text-xs text-muted">
            {challenge.estimatedMinutes} min
            {challenge.targetLevel ? ` · ${challenge.targetLevel} level` : ""}
            {challenge.difficulty ? ` · ${challenge.difficulty}` : ""}
          </p>
          {challenge.description ? (
            <BriefSection label="Overview">
              <p className="text-sm leading-relaxed text-ink-2">{challenge.description}</p>
            </BriefSection>
          ) : null}
          {challenge.steps.length > 0 ? (
            <BriefSection label="Steps">
              <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-ink-2">
                {challenge.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </BriefSection>
          ) : null}
          {challenge.successCriteria.length > 0 ? (
            <BriefSection label="Success criteria (rubric)">
              <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink-2">
                {challenge.successCriteria.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </BriefSection>
          ) : null}
          {challenge.linkedSolutions.length > 0 ? (
            <BriefSection label="Linked solutions">
              <p className="text-sm text-muted">{challenge.linkedSolutions.join(" · ")}</p>
            </BriefSection>
          ) : null}
          {challenge.competencyNames.length > 0 ? (
            <BriefSection label="Competencies">
              <p className="text-sm text-muted">{challenge.competencyNames.join(" · ")}</p>
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
        Loading challenge proof and AI assessment…
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="rounded-[14px] bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
        ▲ {error ?? "Submission details unavailable."}
      </div>
    );
  }

  const tone = detail.aiReview ? scoreTone(detail.aiReview.score) : null;

  return (
    <>
      {showBrief ? (
        <ChallengeBriefModal challenge={detail.challenge} onClose={() => setShowBrief(false)} />
      ) : null}

      <div className="min-w-0 space-y-4">
        {detail.aiReview && tone ? (
          <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
            <div>
              <p className="label-mono">AI initial score</p>
              <p className={`text-[32px] leading-none font-extrabold tracking-[-0.03em] ${tone.text}`}>
                {detail.aiReview.score}
                <span className="text-sm font-bold text-muted">/100</span>
              </p>
            </div>
            <div>
              <p className="label-mono">Suggested grade</p>
              <p className="text-[32px] leading-none font-extrabold tracking-[-0.03em] text-ink">
                {detail.aiReview.suggestedGrade}
                <span className="text-sm font-bold text-muted">/5</span>
              </p>
            </div>
            <Tag tone={tone.tag}>
              {tone.symbol} {tone.label}
            </Tag>
          </div>
        ) : null}
        <button className="link text-sm" onClick={() => setShowBrief(true)} type="button">
          View challenge brief
        </button>

        {detail.aiReview?.summary ? (
          <div className="rounded-[14px] bg-blue-soft px-4 py-3">
            <p className="label-mono mb-1">AI assessment — validate against evidence</p>
            <p className="text-sm leading-relaxed text-ink">{detail.aiReview.summary}</p>
            {detail.aiReview.evidenceNotes ? (
              <p className="mt-1.5 text-sm text-muted">{detail.aiReview.evidenceNotes}</p>
            ) : null}
          </div>
        ) : null}

        {detail.submission.reflectionText ? (
          <div className="rounded-[14px] border border-line bg-white px-4 py-3">
            <p className="label-mono mb-1">SE reflection</p>
            <p className="text-sm italic leading-relaxed text-ink-2">
              &ldquo;{detail.submission.reflectionText}&rdquo;
            </p>
          </div>
        ) : null}

        <div>
          <p className="label-mono mb-2">Submitted proof ({detail.evidence.length})</p>
          {detail.evidence.length === 0 ? (
            <p className="rounded-[14px] bg-danger-soft px-4 py-3 text-sm text-danger">
              ▲ No evidence attached — ask the SE to resubmit with screenshots, exports, or workflow artifacts.
            </p>
          ) : (
            <ul className="overflow-hidden rounded-[14px] border border-line bg-white">
              {detail.evidence.map((item, index) => (
                <li className="border-b border-divider p-3 last:border-b-0" key={`${item.label}-${index}`}>
                  {item.unavailable ? (
                    <p className="text-sm text-danger">
                      ▲ {item.label} — file not found in storage. Ask the SE to re-upload.
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
                        className="link inline-flex items-center gap-1.5 text-sm"
                        onClick={() => openEvidence(item, submissionId, index)}
                        type="button"
                      >
                        <FileText aria-hidden className="h-4 w-4" />
                        Open {item.label} in new tab
                      </button>
                    </div>
                  ) : (
                    <button
                      className="link inline-flex items-center gap-1.5 text-left text-sm"
                      onClick={() => openEvidence(item, submissionId, index)}
                      type="button"
                    >
                      {item.kind === "link" ? (
                        <ExternalLink aria-hidden className="h-4 w-4 shrink-0" />
                      ) : (
                        <FileText aria-hidden className="h-4 w-4 shrink-0" />
                      )}
                      Open {item.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {detail.aiReview && (detail.aiReview.strengths.length > 0 || detail.aiReview.gaps.length > 0) ? (
          <div className="space-y-3">
            <div>
              <p className="label-mono">AI strengths</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink-2">
                {detail.aiReview.strengths.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="label-mono mb-2">AI gaps to validate</p>
              <ul className="overflow-hidden rounded-[14px] border border-line bg-white">
                {detail.aiReview.gaps.map((gap) => (
                  <li className="border-b border-divider last:border-b-0" key={gap}>
                    <button
                      className="flex w-full items-start gap-2 px-4 py-3 text-left text-sm leading-relaxed text-ink-2 transition-colors hover:bg-blue-soft"
                      onClick={() => onAppendMoment?.(gap)}
                      type="button"
                    >
                      <Plus aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-blue" />
                      <span>{gap}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
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
