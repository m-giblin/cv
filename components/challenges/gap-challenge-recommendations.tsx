"use client";

import Link from "next/link";
import { H2_CLS, LINE_CARD_CLS } from "@/components/se/form-classes";
import { Tag } from "@/components/ui/tag";
import type { GapChallengeRecommendation } from "@/lib/challenges/gap-recommendations";

export function GapChallengeRecommendations({
 recommendations,
}: {
 recommendations: GapChallengeRecommendation[];
}) {
 if (recommendations.length === 0) return null;

 return (
 <section aria-labelledby="gap-recs-heading" className="flex flex-col gap-2">
 <div>
 <h2 className={H2_CLS} id="gap-recs-heading">
 Challenges for your gaps
 </h2>
 <p className="text-sm text-muted">
 Matched to your competency focus areas from coaching cards and plan steps.
 </p>
 </div>
 <ul className={`${LINE_CARD_CLS} overflow-hidden`}>
 {recommendations.map((rec) => (
 <li
 className="flex flex-wrap items-center justify-between gap-3 border-b border-divider px-5 py-3.5 last:border-b-0"
 key={rec.challenge.id}
 >
 <div className="min-w-0">
 <p className="text-[15px] font-bold text-ink">{rec.challenge.title}</p>
 <p className="text-[13px] text-muted">{rec.reason}</p>
 </div>
 <div className="flex items-center gap-3">
 {rec.challenge.targetLevel ? <Tag tone="blue">{rec.challenge.targetLevel}</Tag> : null}
 <Link className="link text-sm" href={`/practice/challenges?challenge=${rec.challenge.id}`}>
 Start
 </Link>
 </div>
 </li>
 ))}
 </ul>
 </section>
 );
}
