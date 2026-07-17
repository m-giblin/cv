"use client";

import { ExternalLink, FileText, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ManagerCopilotDraft } from "@/components/manager/manager-copilot-draft";
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
  if (score >= 80) return { label: "Strong", color: "#0A6E45", bg: "#EDFAF3" };
  if (score >= 70) return { label: "Developing", color: "#0071CE", bg: "#EEF4FF" };
  return { label: "Below target", color: "#B83128", bg: "#FEF0EE" };
}

function ChallengeBriefModal({ challenge, onClose }: { challenge: ChallengeBrief; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Close challenge brief"
        className="absolute inset-0 bg-[#00143a]/45 backdrop-blur-[2px]"
        onClick={onClose}
        type="button"
      />
      <div
        aria-labelledby="challenge-brief-title"
        aria-modal="true"
        className="relative flex min-h-0 max-h-[min(85vh,720px)] w-full max-w-xl flex-col overflow-hidden border border-[#E2DFD9] bg-white shadow-xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#ECEAE6] bg-[#F9F8F6] px-4 py-3">
          <div>
            <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-[#A09D98]">Challenge brief</p>
            <h2 className="text-[15px] font-bold text-[#0D0E12]" id="challenge-brief-title">
              {challenge.title}
            </h2>
          </div>
          <button
            aria-label="Close"
            className="p-1 text-[#6B6860] hover:bg-[#ECEAE6]"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 pb-5">
          <p className="font-mono text-[9px] text-[#A09D98]">
            {challenge.estimatedMinutes} min
            {challenge.targetLevel ? ` · ${challenge.targetLevel} level` : ""}
            {challenge.difficulty ? ` · ${challenge.difficulty}` : ""}
          </p>
          {challenge.description ? (
            <section>
              <p className="mb-1 font-mono text-[8px] uppercase tracking-[0.1em] text-[#A09D98]">Overview</p>
              <p className="text-[12px] leading-relaxed text-[#3D3C38]">{challenge.description}</p>
            </section>
          ) : null}
          {challenge.steps.length > 0 ? (
            <section>
              <p className="mb-1 font-mono text-[8px] uppercase tracking-[0.1em] text-[#A09D98]">Steps</p>
              <ol className="list-decimal space-y-1.5 pl-4 text-[11.5px] leading-relaxed text-[#3D3C38]">
                {challenge.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </section>
          ) : null}
          {challenge.successCriteria.length > 0 ? (
            <section>
              <p className="mb-1 font-mono text-[8px] uppercase tracking-[0.1em] text-[#A09D98]">
                Success criteria (rubric)
              </p>
              <ul className="list-disc space-y-1 pl-4 text-[11.5px] leading-relaxed text-[#3D3C38]">
                {challenge.successCriteria.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}
          {challenge.linkedSolutions.length > 0 ? (
            <section>
              <p className="mb-1 font-mono text-[8px] uppercase tracking-[0.1em] text-[#A09D98]">Linked solutions</p>
              <p className="text-[11px] text-[#6B6860]">{challenge.linkedSolutions.join(" · ")}</p>
            </section>
          ) : null}
          {challenge.competencyNames.length > 0 ? (
            <section>
              <p className="mb-1 font-mono text-[8px] uppercase tracking-[0.1em] text-[#A09D98]">Competencies</p>
              <p className="text-[11px] text-[#6B6860]">{challenge.competencyNames.join(" · ")}</p>
            </section>
          ) : null}
          {challenge.linkedResources.length > 0 ? (
            <section>
              <p className="mb-1 font-mono text-[8px] uppercase tracking-[0.1em] text-[#A09D98]">Resources</p>
              <ul className="space-y-1.5">
                {challenge.linkedResources.map((resource) => (
                  <li key={resource}>
                    <a
                      className="text-[11px] font-semibold text-[#0071ce] hover:underline"
                      href={resource}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {resource.replace(/^https?:\/\//, "")}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
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
  challengeTitle,
  onSuggestedGrade,
  onAppendMoment,
  onDraft,
}: {
  submissionId: string;
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
      <div className="flex items-center gap-2 border-t border-[#ECEAE6] px-[18px] py-4 text-[11px] text-[#6B6860]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading challenge proof and AI assessment…
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="border-t border-[#ECEAE6] px-[18px] py-3 text-[11px] text-[#B83128]">
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

      <div className="space-y-3 border-t border-[#ECEAE6] px-[18px] pb-3 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          {detail.aiReview && tone ? (
            <span
              className="px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.08em]"
              style={{ background: tone.bg, color: tone.color }}
            >
              AI initial score · {detail.aiReview.score}/100 ({tone.label}) — suggested grade{" "}
              {detail.aiReview.suggestedGrade}/5
            </span>
          ) : null}
          <button
            className="text-[10px] font-semibold text-[#0071ce] hover:underline"
            onClick={() => setShowBrief(true)}
            type="button"
          >
            View challenge brief →
          </button>
        </div>

        {detail.aiReview?.summary ? (
          <div className="border-l-[3px] border-[#7c3aed] bg-[#F5F0FF] px-3 py-2.5">
            <p className="mb-1 font-mono text-[8px] uppercase tracking-[0.1em] text-[#7c3aed]">
              AI assessment — validate against evidence
            </p>
            <p className="text-[12px] leading-relaxed text-[#0D0E12]">{detail.aiReview.summary}</p>
            {detail.aiReview.evidenceNotes ? (
              <p className="mt-1.5 text-[10.5px] text-[#6B6860]">{detail.aiReview.evidenceNotes}</p>
            ) : null}
          </div>
        ) : null}

        {detail.submission.reflectionText ? (
          <div className="border border-[#E2DFD9] bg-[#F9F8F6] px-3 py-2">
            <p className="mb-1 font-mono text-[8px] uppercase tracking-[0.1em] text-[#A09D98]">
              SE reflection
            </p>
            <p className="text-[11px] italic leading-relaxed text-[#3D3C38]">
              &ldquo;{detail.submission.reflectionText}&rdquo;
            </p>
          </div>
        ) : null}

        <div>
          <p className="mb-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-[#6B6860]">
            Submitted proof ({detail.evidence.length})
          </p>
          {detail.evidence.length === 0 ? (
            <p className="border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[11px] text-[#B83128]">
              No evidence attached — ask the SE to resubmit with screenshots, exports, or workflow artifacts.
            </p>
          ) : (
            <div className="space-y-2">
              {detail.evidence.map((item, index) => (
                <div className="border border-[#E2DFD9] bg-white p-2" key={`${item.label}-${index}`}>
                  {item.unavailable ? (
                    <p className="text-[11px] text-[#B83128]">
                      {item.label} — file not found in storage. Ask the SE to re-upload.
                    </p>
                  ) : item.kind === "image" && item.href ? (
                    <button
                      className="block w-full text-left"
                      onClick={() => openEvidence(item, submissionId, index)}
                      type="button"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt={item.label}
                        className="max-h-[280px] w-full rounded border border-[#ECEAE6] object-contain bg-[#0A0A0E]"
                        src={item.href}
                      />
                    </button>
                  ) : isPdfEvidence(item) && item.href ? (
                    <div className="space-y-2">
                      <iframe
                        className="h-[360px] w-full border border-[#ECEAE6] bg-white"
                        src={item.href}
                        title={item.label}
                      />
                      <button
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#0071ce] hover:underline"
                        onClick={() => openEvidence(item, submissionId, index)}
                        type="button"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Open {item.label} in new tab
                      </button>
                    </div>
                  ) : (
                    <button
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#0071ce] hover:underline"
                      onClick={() => openEvidence(item, submissionId, index)}
                      type="button"
                    >
                      {item.kind === "link" ? (
                        <ExternalLink className="h-3.5 w-3.5" />
                      ) : (
                        <FileText className="h-3.5 w-3.5" />
                      )}
                      Open {item.label}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {detail.aiReview && (detail.aiReview.strengths.length > 0 || detail.aiReview.gaps.length > 0) ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#6B6860]">AI strengths</p>
              <ul className="mt-1 list-disc pl-4 text-[11px] text-[#3D3C38]">
                {detail.aiReview.strengths.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-[#6B6860]">AI gaps to validate</p>
              <ul className="mt-1 space-y-1">
                {detail.aiReview.gaps.map((gap) => (
                  <li key={gap}>
                    <button
                      className="w-full border border-[#E2DFD9] bg-[#F9F8F6] px-3 py-2 text-left text-[11px] leading-relaxed text-[#3D3C38] transition hover:border-[#0071ce]/40 hover:bg-[#EEF4FF]"
                      onClick={() => onAppendMoment?.(gap)}
                      type="button"
                    >
                      <span className="mr-1.5 font-semibold text-[#0071ce]">→</span>
                      {gap}
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
