import type { RubricCriterion } from "@/lib/simulations/session-rubric";
import type { SimulationAssignment } from "@/lib/types";
import { difficultyToPromptLabel } from "@/lib/simulations/prompt-template";
import { Tag } from "@/components/ui/tag";

function initialsFromName(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function scenarioContext(assignment: SimulationAssignment) {
  if (assignment.persona.toLowerCase().includes("objection")) {
    return `Objection practice with ${assignment.persona} — validate the concern, reframe with proof, and advance discovery on ${assignment.solutionFocus}.`;
  }

  return `You're in a ${assignment.vertical} evaluation for ${assignment.solutionFocus}. The buyer is ${assignment.persona} — expect scrutiny on governance, audit readiness, and implementation risk.`;
}

function scenarioObjective(assignment: SimulationAssignment) {
  if (assignment.persona.toLowerCase().includes("objection")) {
    return "Acknowledge the objection, land a proof point, and ask a discovery question that moves the evaluation forward.";
  }

  return "Qualify identity pain, establish budget timeline, and create urgency for a technical workshop or mutual action plan.";
}

export function SimulationScenarioBrief({
  assignment,
  criteria,
  turnCount,
}: {
  assignment: SimulationAssignment;
  criteria: RubricCriterion[];
  turnCount: number;
}) {
  const personaInitials = initialsFromName(assignment.persona) || "AI";

  return (
    <aside className="flex min-h-0 flex-col overflow-y-auto border-b border-line bg-white lg:border-b-0 lg:border-r">
      <div className="bg-blue px-[18px] py-4 text-white">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.03em] text-signal">Persona</p>
        <div className="mt-2 flex items-start gap-3">
          <div
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-signal font-mono text-xs font-medium text-ink"
          >
            {personaInitials}
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold leading-tight text-white">{assignment.persona}</p>
            <p className="mt-0.5 font-mono text-xs uppercase tracking-[0.03em] text-on-blue-muted">
              {assignment.vertical} · {difficultyToPromptLabel(assignment.difficulty)}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[assignment.vertical, assignment.solutionFocus.split(" ")[0] ?? "ISC", "Discovery"].map((tag) => (
            <span
              className="rounded-full border-[1.5px] border-blue-line px-[9px] py-0.5 font-mono text-xs uppercase tracking-[0.03em] text-on-blue"
              key={tag}
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-3 flex items-end justify-between gap-3 border-t border-blue-line pt-3">
          <p className="text-[13px] leading-[1.45] text-on-blue">{assignment.solutionFocus}</p>
          <div className="text-right">
            <p className="text-[22px] font-extrabold leading-none tracking-[-0.03em] text-white">{turnCount}</p>
            <p className="font-mono text-xs uppercase tracking-[0.03em] text-on-blue-muted">Turns</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <p className="label-mono">Scenario</p>
          <p className="mt-2 text-sm leading-[1.5] text-ink-2">{scenarioContext(assignment)}</p>
        </div>

        <div className="rounded-[10px] border-l-[3px] border-signal bg-signal-soft p-3">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.03em] text-ink">Your objective</p>
          <p className="mt-1.5 text-sm leading-[1.5] text-ink">{scenarioObjective(assignment)}</p>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="label-mono">You&apos;ll be scored on</p>
            <Tag tone="neutral">{criteria.length} criteria</Tag>
          </div>
          <ul className="mt-2 overflow-hidden rounded-[14px] border border-line">
            {criteria.map((item, index) => (
              <li className={`px-3.5 py-2.5 ${index > 0 ? "border-t border-divider" : ""}`} key={item.label}>
                <p className="text-sm font-bold text-ink">{item.label}</p>
                <p className="mt-0.5 text-[13px] leading-[1.45] text-ink-2">{item.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
