import { buildSimTrend } from "@/lib/manager/growth-insights";
import { SimTrendChart } from "@/components/manager/sim-trend-chart";
import type { CoachingCard } from "@/lib/types";

export function SeSkillTrendPanel({ cards }: { cards: CoachingCard[] }) {
  const trend = buildSimTrend(cards.filter((c) => !c.isPractice));

  return (
    <div className="mb-5 overflow-hidden rounded-xl border border-[#e2eaf5] bg-white p-5 shadow-[0_1px_4px_rgba(0,20,58,0.05)]">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Skill trend</p>
      <p className="mt-1 text-sm font-bold text-[#00143a]">Simulation scores over time</p>
      <div className="mt-4">
        <SimTrendChart trend={trend} />
      </div>
    </div>
  );
}
