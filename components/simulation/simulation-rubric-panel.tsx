import type { RubricCriterion } from "@/lib/simulations/session-rubric";

export function SimulationRubricPanel({ criteria }: { criteria: RubricCriterion[] }) {
  return (
    <div className="rounded-xl border border-[#0071ce]/20 bg-[#e8f2fc]/40 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#0057a8]">
        You&apos;ll be scored on
      </p>
      <ul className="mt-2 space-y-2">
        {criteria.map((item) => (
          <li className="text-sm" key={item.label}>
            <span className="font-semibold text-[#00143a]">{item.label}</span>
            <span className="text-slate-600"> — {item.description}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
