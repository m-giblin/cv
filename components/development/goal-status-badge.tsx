import { Badge } from "@/components/ui/badge";
import { GoalStatus } from "@/lib/types";

const labels: Record<GoalStatus, string> = {
 not_started: "Not started",
 on_track: "On track",
 at_risk: "At risk",
 achieved: "Achieved",
};

const tones: Record<GoalStatus, "blue" | "green" | "amber" | "magenta"> = {
 not_started: "blue",
 on_track: "green",
 at_risk: "amber",
 achieved: "magenta",
};

export function GoalStatusBadge({ status }: { status: GoalStatus }) {
 return <Badge tone={tones[status]}>{labels[status]}</Badge>;
}
