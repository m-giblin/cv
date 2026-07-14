import { buildSimTrend } from "@/lib/manager/growth-insights";
import { SimTrendChart } from "@/components/manager/sim-trend-chart";
import type { CoachingCard } from "@/lib/types";

export function SeSkillTrendPanel({ cards }: { cards: CoachingCard[] }) {
 const trend = buildSimTrend(cards.filter((c) => !c.isPractice));

 return (
 <div className="mb-5 overflow-hidden border border-[#E2DFD9] bg-white p-5 ">
 <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Skill trend</p>
 <p className="mt-1 text-sm font-bold text-[#00143a]">Simulation scores over time</p>
 <div className="mt-4">
 <SimTrendChart trend={trend} />
 </div>
 </div>
 );
}
