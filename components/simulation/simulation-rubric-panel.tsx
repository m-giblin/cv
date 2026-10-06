import type { RubricCriterion } from "@/lib/simulations/session-rubric";
import { LINE_CARD_CLS } from "@/components/se/form-classes";

export function SimulationRubricPanel({ criteria }: { criteria: RubricCriterion[] }) {
  return (
    <div className={`${LINE_CARD_CLS} px-5 py-3.5`}>
      <p className="label-caps">You&apos;ll be scored on</p>
      <ul className="mt-2 space-y-2">
        {criteria.map((item) => (
          <li className="text-sm leading-[1.5]" key={item.label}>
            <span className="font-bold text-ink">{item.label}</span>
            <span className="text-ink-2">: {item.description}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
