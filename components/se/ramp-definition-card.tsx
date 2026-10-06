import Link from "next/link";
import { DefinitionCard } from "@/components/ui/editorial";
import { Runway } from "@/components/ui/runway";
import { numberWord, pad2, type RampModel } from "@/lib/se/ramp-model";
import { cn } from "@/lib/utils";

function segmentNote(segment: RampModel["segments"][number]): string {
  if (segment.state === "done") return `Done, ${segment.validated} of ${segment.steps.length}`;
  if (segment.state === "current") return "You are here";
  return `Starts week ${segment.startWeek}`;
}

/** Today rail (artboard 1a): "ramp, noun, field" with the segment boxes and the navy runway. */
export function RampDefinitionCard({ model }: { model: RampModel | null }) {
  if (!model) {
    return (
      <DefinitionCard partOfSpeech="noun, field" word="ramp">
        The weeks between your first login and your first solo customer call. Your manager assigns yours, and it
        shows up here.
      </DefinitionCard>
    );
  }

  const segmented = model.segments.length > 1;
  const weeks = model.totalWeeks;

  return (
    <DefinitionCard
      inner={
        <>
          {segmented ? (
            <ol className="flex flex-wrap gap-2.5">
              {model.segments.map((segment, index) => (
                <li
                  className={cn(
                    "flex min-w-[110px] flex-1 flex-col gap-1.5 rounded-[10px] border px-4 py-3.5",
                    segment.state === "current" ? "border-signal bg-[#13214A]" : "border-[#2A3A63]",
                  )}
                  key={segment.index}
                >
                  <span
                    className={cn(
                      "label-caps",
                      segment.state === "upcoming" ? "text-on-navy-muted" : "text-signal",
                    )}
                  >
                    {pad2(index + 1)} {segment.label}
                  </span>
                  <span className={cn("text-sm", segment.state === "upcoming" ? "text-on-navy-muted" : "text-on-navy")}>
                    {segmentNote(segment)}
                  </span>
                </li>
              ))}
            </ol>
          ) : null}
          <div className="flex flex-col gap-2">
            <Runway
              currentWeek={model.currentWeek}
              onNavy
              segments={model.segments.map((segment) => ({ label: segment.label, weeks: segment.weeks }))}
              showLabels={false}
            />
            <div className="flex justify-between gap-3 text-[13px] text-on-navy-muted">
              <span>Week 1</span>
              <span className="font-bold text-white">
                Week {model.currentWeek}
                {model.daysLeft !== null ? `, ${model.daysLeft} days left` : ""}
              </span>
              <span>Week {weeks}</span>
            </div>
          </div>
        </>
      }
      link={
        <Link className="link text-[15px]" href="/my-plan">
          See my whole ramp
        </Link>
      }
      partOfSpeech="noun, field"
      word="ramp"
    >
      The {numberWord(weeks)} weeks between your first login and your first solo customer call.
      {segmented ? ` ${capitalize(numberWord(model.segments.length))} segments get you there:` : ""}
    </DefinitionCard>
  );
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
