import type { RubricCriterion } from "@/lib/simulations/session-rubric";
import type { SimulationAssignment } from "@/lib/types";
import { difficultyToPromptLabel } from "@/lib/simulations/prompt-template";

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
    <aside className="flex min-h-0 flex-col overflow-y-auto border-b border-[#E2DFD9] bg-[#F9F8F6] lg:border-b-0 lg:border-r">
      <div className="relative overflow-hidden bg-[#00143A] p-[16px_18px]">
        <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[#CC27B0]/20 blur-sm" />
        <p className="font-mono text-[8px] font-medium uppercase tracking-[0.14em] text-white/40">Persona</p>
        <div className="mt-2 flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold text-white"
            style={{ background: "linear-gradient(135deg,#0033a1,#cc27b0)" }}
          >
            {personaInitials}
          </div>
          <div className="min-w-0">
            <p className="font-display text-[15px] font-extrabold leading-tight text-white">{assignment.persona}</p>
            <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-white/45">
              {assignment.vertical} · {difficultyToPromptLabel(assignment.difficulty)}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[assignment.vertical, assignment.solutionFocus.split(" ")[0] ?? "ISC", "Discovery"].map((tag) => (
            <span
              className="border border-white/10 bg-white/[0.06] px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.08em] text-white/70"
              key={tag}
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
          <p className="text-[10px] text-white/50">{assignment.solutionFocus}</p>
          <div className="text-right">
            <p className="font-display text-[16px] font-extrabold leading-none text-white">{turnCount}</p>
            <p className="font-mono text-[8px] uppercase tracking-[0.08em] text-white/35">turns</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <p className="font-mono text-[8px] font-medium uppercase tracking-[0.12em] text-[#A09D98]">Scenario</p>
          <p className="mt-2 text-[12px] leading-[1.65] text-[#374151]">{scenarioContext(assignment)}</p>
        </div>

        <div className="border-l-[3px] border-[#D4810A] bg-[#FFFBF0] p-3">
          <p className="font-mono text-[8px] font-medium uppercase tracking-[0.12em] text-[#D4810A]">
            Your objective
          </p>
          <p className="mt-1.5 text-[11.5px] leading-[1.6] text-[#5C4200]">{scenarioObjective(assignment)}</p>
        </div>

        <div>
          <p className="font-mono text-[8px] font-medium uppercase tracking-[0.12em] text-[#A09D98]">
            You&apos;ll be scored on
          </p>
          <ul className="mt-2 space-y-2">
            {criteria.map((item) => (
              <li className="border border-[#E2DFD9] bg-white p-2.5" key={item.label}>
                <p className="text-[11px] font-semibold text-[#0D0E12]">{item.label}</p>
                <p className="mt-0.5 text-[10.5px] leading-[1.5] text-[#6B6860]">{item.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
