import { Tag } from "@/components/ui/tag";
import { GoalStatus } from "@/lib/types";

const labels: Record<GoalStatus, string> = {
  not_started: "○ Not started",
  on_track: "● On track",
  at_risk: "▲ At risk",
  achieved: "✓ Achieved",
};

const tones: Record<GoalStatus, "neutral" | "blue" | "danger" | "success"> = {
  not_started: "neutral",
  on_track: "blue",
  at_risk: "danger",
  achieved: "success",
};

export function GoalStatusBadge({ status }: { status: GoalStatus }) {
  return <Tag tone={tones[status]}>{labels[status]}</Tag>;
}
