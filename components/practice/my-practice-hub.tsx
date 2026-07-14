import Link from "next/link";
import {
  Bot,
  BrainCircuit,
  Briefcase,
  CheckCircle2,
  Mic,
  Radio,
  Sparkles,
  Zap,
} from "lucide-react";
import { StatusTag } from "@/components/design/status-tag";
import { simScoreColor } from "@/components/manager/manager-ui-primitives";
import type { CoachingCard, ChallengeSubmission, Profile } from "@/lib/types";

export type PracticeModule = {
  name: string;
  tag: string;
  tagBg: string;
  tagColor: string;
  desc: string;
  href: string;
  lastScore: string;
  scoreColor: string;
  cta: string;
  ctaBg: string;
  ctaColor: string;
  iconBg: string;
  iconColor: string;
  icon: React.ReactNode;
  secondary?: boolean;
};

export type PendingReviewItem = {
  title: string;
  sub: string;
  accent: string;
  status: string;
  statBg: string;
  statColor: string;
};

function scoreLabel(score: number | null) {
  if (score === null) return "—";
  return String(score);
}

export function buildPracticeModules(
  simAvg: number | null,
  challengeDone: number,
  challengeTotal: number,
): { top: PracticeModule[]; bottom: PracticeModule[] } {
  const simColor = simAvg !== null ? simScoreColor(simAvg) : "#B0ADA8";

  const top: PracticeModule[] = [
    {
      name: "Simulations",
      tag: "AI ROLEPLAY",
      tagBg: "#FDF0FA",
      tagColor: "#A51E8E",
      icon: <Bot className="h-[17px] w-[17px]" strokeWidth={1.3} />,
      iconBg: "#FDF0FA",
      iconColor: "#CC27B0",
      desc: "Live AI roleplay with scored personas. Roleplay → AI coaching feedback → submit to manager.",
      href: "/simulations",
      lastScore: scoreLabel(simAvg),
      scoreColor: simColor,
      cta: "Run sim →",
      ctaBg: "#CC27B0",
      ctaColor: "#ffffff",
    },
    {
      name: "Pitch Studio",
      tag: "VIDEO",
      tagBg: "#FEF0EE",
      tagColor: "#B83128",
      icon: <Mic className="h-[17px] w-[17px]" strokeWidth={1.3} />,
      iconBg: "#FEF0EE",
      iconColor: "#B83128",
      desc: "Record your pitch on video, get AI scoring on clarity, structure, and impact — then submit for peer review.",
      href: "/pitch",
      lastScore: "—",
      scoreColor: "#B0ADA8",
      cta: "Record →",
      ctaBg: "#B83128",
      ctaColor: "#ffffff",
    },
    {
      name: "Challenges",
      tag: "WRITTEN",
      tagBg: "#EDE9FE",
      tagColor: "#5b21b6",
      icon: <Zap className="h-[17px] w-[17px]" strokeWidth={1.3} />,
      iconBg: "#EDE9FE",
      iconColor: "#7c3aed",
      desc: "Written scenario responses — discovery briefs, objection responses, competitive positioning.",
      href: "/challenges",
      lastScore: challengeTotal > 0 ? `${challengeDone}/${challengeTotal}` : "—",
      scoreColor: "#0D0E12",
      cta: "Start →",
      ctaBg: "#00143A",
      ctaColor: "#ffffff",
    },
  ];

  const bottom: PracticeModule[] = [
    {
      name: "Flight Check",
      tag: "ASSESSMENT",
      tagBg: "#E0F2FE",
      tagColor: "#0369A1",
      icon: <CheckCircle2 className="h-[13px] w-[13px]" strokeWidth={1.3} />,
      iconBg: "#E0F2FE",
      iconColor: "#0369A1",
      desc: "Adaptive competency assessment — difficulty adjusts to your gaps.",
      href: "/flight-check",
      lastScore: "—",
      scoreColor: "#B0ADA8",
      cta: "Assess →",
      ctaBg: "#0369A1",
      ctaColor: "#ffffff",
      secondary: true,
    },
    {
      name: "Market Pulse",
      tag: "COMPETITIVE",
      tagBg: "#ECFDF5",
      tagColor: "#065F46",
      icon: <Radio className="h-[13px] w-[13px]" strokeWidth={1.3} />,
      iconBg: "#ECFDF5",
      iconColor: "#059669",
      desc: "Weekly quizzes on competitive positioning. Scores feed your readiness map.",
      href: "/market-pulse",
      lastScore: "—",
      scoreColor: "#0A6E45",
      cta: "Take quiz →",
      ctaBg: "#059669",
      ctaColor: "#ffffff",
      secondary: true,
    },
    {
      name: "Deal Prep",
      tag: "PRE-CALL",
      tagBg: "#FFFBF0",
      tagColor: "#D4810A",
      icon: <Briefcase className="h-[13px] w-[13px]" strokeWidth={1.3} />,
      iconBg: "#FFFBF0",
      iconColor: "#D4810A",
      desc: "AI-powered pre-call brief — account context, discovery questions, objection prep.",
      href: "/prep",
      lastScore: "—",
      scoreColor: "#B0ADA8",
      cta: "Prep call →",
      ctaBg: "#D4810A",
      ctaColor: "#ffffff",
      secondary: true,
    },
    {
      name: "ISC Lab",
      tag: "AI COACH",
      tagBg: "#EEF4FF",
      tagColor: "#1D4ED8",
      icon: <BrainCircuit className="h-[13px] w-[13px]" strokeWidth={1.3} />,
      iconBg: "#EEF4FF",
      iconColor: "#0071CE",
      desc: "Ask anything — searches docs, battlecards, and peer golden pitches with citations.",
      href: "/lab",
      lastScore: "—",
      scoreColor: "#B0ADA8",
      cta: "Ask →",
      ctaBg: "#0071CE",
      ctaColor: "#ffffff",
      secondary: true,
    },
  ];

  return { top, bottom };
}

function PracticeModuleCard({ module }: { module: PracticeModule }) {
  if (module.secondary) {
    return (
      <Link
        className="group flex cursor-pointer flex-col bg-[#F9F8F6] p-[14px_16px] transition hover:bg-white"
        href={module.href}
      >
        <div className="mb-[9px] flex items-center justify-between">
          <div
            className="flex h-[28px] w-[28px] shrink-0 items-center justify-center"
            style={{ background: module.iconBg, color: module.iconColor }}
          >
            {module.icon}
          </div>
          <StatusTag bgColor={module.tagBg} label={module.tag} textColor={module.tagColor} />
        </div>
        <div className="mb-[3px] font-display text-[12.5px] font-extrabold tracking-[-0.01em] text-[#0D0E12]">
          {module.name}
        </div>
        <p className="mb-[11px] flex-1 text-[10.5px] leading-[1.5] text-[#6B6860]">{module.desc}</p>
        <div className="flex items-center justify-between border-t border-[#E2DFD9] pt-[9px]">
          <div className="font-mono text-[15px] font-normal" style={{ color: module.scoreColor }}>
            {module.lastScore}
          </div>
          <span
            className="inline-flex items-center px-[10px] py-[5px] text-[10px] font-semibold"
            style={{ background: module.ctaBg, color: module.ctaColor }}
          >
            {module.cta}
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      className="group flex cursor-pointer flex-col bg-white p-[18px_18px_16px] transition hover:bg-[#F9F8F6]"
      href={module.href}
    >
      <div className="mb-3 flex items-start justify-between">
        <div
          className="flex h-[36px] w-[36px] shrink-0 items-center justify-center"
          style={{ background: module.iconBg, color: module.iconColor }}
        >
          {module.icon}
        </div>
        <StatusTag bgColor={module.tagBg} label={module.tag} textColor={module.tagColor} />
      </div>
      <div className="mb-1 font-display text-[14px] font-extrabold tracking-[-0.015em] text-[#0D0E12]">
        {module.name}
      </div>
      <p className="mb-[14px] flex-1 text-[11px] leading-[1.55] text-[#6B6860]">{module.desc}</p>
      <div className="flex items-center justify-between border-t border-[#F2F0EC] pt-[10px]">
        <div>
          <div className="mb-[2px] font-mono text-[9px] uppercase tracking-[0.08em] text-[#B0ADA8]">Last score</div>
          <div className="font-mono text-[17px] font-normal" style={{ color: module.scoreColor }}>
            {module.lastScore}
          </div>
        </div>
        <span
          className="inline-flex items-center px-3 py-[6px] text-[11px] font-semibold"
          style={{ background: module.ctaBg, color: module.ctaColor }}
        >
          {module.cta}
        </span>
      </div>
    </Link>
  );
}

export function MyPracticeHub({
  user,
  coachingCards,
  submissions,
  recommendedTitle,
  recommendedSub,
}: {
  user: Profile;
  coachingCards: CoachingCard[];
  submissions: ChallengeSubmission[];
  recommendedTitle?: string;
  recommendedSub?: string;
}) {
  const firstName = user.fullName.split(" ")[0] ?? user.fullName;
  const myCards = coachingCards.filter((c) => c.userId === user.id);
  const simAvg =
    myCards.length > 0
      ? Math.round(myCards.reduce((sum, card) => sum + card.score, 0) / myCards.length)
      : null;
  const mySubmissions = submissions.filter((s) => s.userId === user.id);
  const challengeDone = mySubmissions.filter((s) => s.status === "reviewed" || s.status === "completed").length;
  const challengeTotal = Math.max(mySubmissions.length, 8);
  const { top, bottom } = buildPracticeModules(simAvg, challengeDone, challengeTotal);

  const pending: PendingReviewItem[] = [
    ...mySubmissions
      .filter((s) => s.status === "submitted" || s.status === "under_review")
      .slice(0, 2)
      .map((s, i) => ({
        title: `Challenge ${s.challengeId.slice(0, 8)}`,
        sub: s.submittedAt
          ? `Submitted ${new Date(s.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
          : "Awaiting review",
        accent: i === 0 ? "#0071CE" : "#CC27B0",
        status: "MANAGER REVIEW",
        statBg: i === 0 ? "#EEF4FF" : "#FDF0FA",
        statColor: i === 0 ? "#0071CE" : "#A51E8E",
      })),
    ...myCards
      .filter((card) => !card.isPractice && card.managerReviewStatus === "pending")
      .slice(0, 2)
      .map((card) => ({
        title: card.simulationContext?.persona ?? "Simulation coaching card",
        sub: card.sentToManagerAt
          ? `Submitted ${new Date(card.sentToManagerAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
          : "Awaiting review",
        accent: "#0071CE",
        status: "MANAGER REVIEW",
        statBg: "#EEF4FF",
        statColor: "#0071CE",
      })),
  ].slice(0, 2);

  const reviewedCount = mySubmissions.filter((s) => s.status === "reviewed" || s.status === "completed").length;
  const avgFeedback =
    myCards.length > 0
      ? Math.round(myCards.reduce((sum, c) => sum + c.score, 0) / myCards.length)
      : null;

  const heroTitle = recommendedTitle ?? "SLED vertical discovery — state CIO persona";
  const heroSub =
    recommendedSub ?? "Your lowest competency · Simulations · score gap to 80 target";

  return (
    <div className="handoff-page-enter px-[22px] pb-[34px] pt-[22px]">
      <div className="mb-5 border-l-[3px] border-[#CC27B0] pl-[14px]">
        <p className="mb-[5px] font-mono text-[8.5px] uppercase tracking-[0.16em] text-[#A09D98]">
          {firstName} · Personal practice
        </p>
        <h1 className="font-display text-[30px] font-extrabold leading-none tracking-[-0.035em] text-[#0D0E12]">
          My Practice
        </h1>
        <p className="mt-1 text-[12px] text-[#6B6860]">
          Same tools your SEs use — sharpen your own skills, submit for peer or admin review
        </p>
      </div>

      <div className="relative mb-[18px] flex items-center gap-5 overflow-hidden bg-[#00143A] p-[16px_20px]">
        <div className="pointer-events-none absolute -right-5 -top-5 h-[120px] w-[120px] rounded-full bg-[rgba(204,39,176,0.12)]" />
        <div className="pointer-events-none absolute bottom-[-30px] right-[60px] h-[80px] w-[80px] rounded-full bg-[rgba(0,113,206,0.1)]" />
        <div className="relative z-[1] flex-1">
          <p className="mb-[6px] font-mono text-[8px] uppercase tracking-[0.14em] text-white/40">
            This week · AI recommended
          </p>
          <p className="mb-[3px] font-display text-[16px] font-extrabold tracking-[-0.02em] text-white">{heroTitle}</p>
          <p className="text-[11.5px] text-white/50">{heroSub}</p>
        </div>
        <div className="relative z-[1] flex shrink-0 gap-2">
          <Link
            className="inline-flex items-center border border-white/15 bg-white/10 px-3 py-[6px] text-[11px] font-semibold text-white/70"
            href="/simulations"
          >
            Preview
          </Link>
          <Link
            className="inline-flex items-center bg-[#CC27B0] px-3 py-[6px] text-[11px] font-semibold text-white"
            href="/simulations"
          >
            Launch →
          </Link>
        </div>
      </div>

      <div className="mb-px grid grid-cols-1 gap-px border border-[#E2DFD9] bg-[#E2DFD9] md:grid-cols-3">
        {top.map((module) => (
          <PracticeModuleCard key={module.name} module={module} />
        ))}
      </div>

      <div className="mb-[14px] grid grid-cols-2 gap-px border border-t-0 border-[#E2DFD9] bg-[#E2DFD9] lg:grid-cols-4">
        {bottom.map((module) => (
          <PracticeModuleCard key={module.name} module={module} />
        ))}
      </div>

      <div className="overflow-hidden border border-[#E2DFD9] bg-white">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[#ECEAE6] bg-[#F9F8F6] px-4 py-[11px]">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-display text-[13px] font-bold text-[#0D0E12]">Pending review</span>
            <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-[#B0ADA8]">
              Awaiting peer or admin feedback
            </span>
          </div>
          <div className="flex gap-[5px]">
            <button className="border border-[#E2DFD9] bg-white px-3 py-[5px] text-[11px] font-semibold text-[#3D3C38]" type="button">
              Submit to peer
            </button>
            <button className="bg-[#0033A1] px-3 py-[5px] text-[11px] font-semibold text-white" type="button">
              Submit to admin
            </button>
          </div>
        </div>
        <div className="grid gap-px bg-[#E2DFD9] md:grid-cols-2">
          {pending.length > 0 ? (
            pending.map((item) => (
              <div className="border-l-[3px] bg-white p-[12px_16px]" key={item.title} style={{ borderLeftColor: item.accent }}>
                <div className="mb-1 flex items-center gap-[7px]">
                  <StatusTag bgColor={item.statBg} label={item.status} textColor={item.statColor} />
                  <span className="font-mono text-[8.5px] text-[#B0ADA8]">{item.sub}</span>
                </div>
                <p className="text-[12px] font-semibold text-[#0D0E12]">{item.title}</p>
              </div>
            ))
          ) : (
            <div className="col-span-2 bg-white p-[12px_16px] text-[12px] text-[#6B6860]">
              No submissions awaiting review. Complete a simulation or challenge to submit for feedback.
            </div>
          )}
          <div className="flex items-center gap-[14px] bg-[#F9F8F6] p-[12px_16px] md:col-span-2">
            <div className="flex items-center gap-1 font-mono text-[9px] text-[#0A6E45]">
              <Sparkles className="h-3 w-3" />
              {reviewedCount} reviewed this Q
            </div>
            {avgFeedback !== null ? (
              <div className="font-mono text-[9px] text-[#B0ADA8]">Avg feedback score {avgFeedback}</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
