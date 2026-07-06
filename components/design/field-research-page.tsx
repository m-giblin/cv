"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  COMPETITIVE_PLATFORMS,
  SYNTHESIS_FOR_SAILPOINT_SE,
  averageScore,
} from "@/components/design/competitive-research";

function ScoreBar({ score, label }: { score: number; label: string }) {
  return (
    <div>
      <div className="flex justify-between text-[10px]">
        <span className="text-stone-600">{label}</span>
        <span className="font-semibold text-stone-900">{score}/5</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100">
        <div className="h-full rounded-full bg-[#0033a1]" style={{ width: `${(score / 5) * 100}%` }} />
      </div>
    </div>
  );
}

export function FieldResearchPage() {
  const ranked = [...COMPETITIVE_PLATFORMS].sort((a, b) => averageScore(b) - averageScore(a));

  return (
    <div className="design-northstar min-h-screen bg-[#fdfbf7]">
      <div className="border-b border-stone-200/80 bg-white px-4 py-4 lg:px-6">
        <Link
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#0033a1] hover:underline"
          href="/design/field"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to FIELD mock
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-stone-900">Competitive UX research</h1>
        <p className="mt-1 max-w-3xl text-sm text-stone-600">
          Honest read on seven platforms for SailPoint SE onboarding — portal design, flow, ease of use, and what to
          steal vs. skip.
        </p>
      </div>

      <main className="mx-auto max-w-6xl space-y-8 p-4 lg:p-6">
        <section className="ns-card ns-card-primary p-5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#0033a1]">Recommendation</p>
          <h2 className="mt-1 text-xl font-bold text-stone-900">{SYNTHESIS_FOR_SAILPOINT_SE.recommendedDirection} direction</h2>
          <p className="mt-2 text-sm text-stone-700">{SYNTHESIS_FOR_SAILPOINT_SE.tagline}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-bold text-stone-900">SE home must-haves</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-stone-700">
                {SYNTHESIS_FOR_SAILPOINT_SE.seHomeMustHave.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-stone-900">Avoid</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-stone-700">
                {SYNTHESIS_FOR_SAILPOINT_SE.avoid.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="rounded-lg bg-[#0033a1] px-4 py-2 text-sm font-semibold text-white" href="/design/field">
              SE mock
            </Link>
            <Link
              className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-800"
              href="/design/field/manager"
            >
              Manager mock
            </Link>
            <Link
              className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-800"
              href="/design/northstar"
            >
              Northstar (production)
            </Link>
          </div>
        </section>

        <section className="space-y-4">
          {ranked.map((platform) => (
            <article className="ns-card border border-stone-200 p-5" key={platform.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-stone-900">{platform.name}</h3>
                  <p className="text-xs text-stone-500">{platform.category}</p>
                </div>
                <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-center">
                  <p className="text-[10px] font-medium uppercase text-stone-500">Overall</p>
                  <p className="text-lg font-bold text-[#0033a1]">{averageScore(platform).toFixed(1)}</p>
                  <p className="text-[10px] text-stone-500">
                    {averageScore(platform) >= 4 ? "Strong fit" : averageScore(platform) >= 3 ? "Partial fit" : "Weak fit"}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-sm font-medium text-stone-800">{platform.honestTake}</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <ScoreBar label="Portal design" score={platform.portalDesign} />
                <ScoreBar label="Workflow flow" score={platform.workflowFlow} />
                <ScoreBar label="Ease of use" score={platform.easeOfUse} />
                <ScoreBar label="SE onboarding fit" score={platform.onboardingFit} />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-bold text-stone-900">Portal</p>
                  <p className="mt-1 text-xs text-stone-600">{platform.portalNotes}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-900">Flow</p>
                  <p className="mt-1 text-xs text-stone-600">{platform.flowNotes}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                  <p className="text-[10px] font-bold uppercase text-emerald-800">Steal</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-stone-700">
                    {platform.steal.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-3">
                  <p className="text-[10px] font-bold uppercase text-rose-800">Skip</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-stone-700">
                    {platform.skip.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
