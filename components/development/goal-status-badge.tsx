import { StatusPill } from "@/components/ui/status-pill";
import { GoalStatus } from "@/lib/types";

const labels: Record<GoalStatus, string> = {
  not_started: "Not started",
  on_track: "On track",
  at_risk: "At risk",
  achieved: "Achieved",
};

const tones: Record<GoalStatus, "neutral" | "blue" | "danger" | "success"> = {
  not_started: "neutral",
  on_track: "blue",
  at_risk: "danger",
  achieved: "success",
};

/** Goal status as dot + word. */
export function GoalStatusBadge({ status }: { status: GoalStatus }) {
  return <StatusPill tone={tones[status]}>{labels[status]}</StatusPill>;
}
