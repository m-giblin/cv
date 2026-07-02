import { Badge } from "@/components/ui/badge";
import { AssignmentStatus } from "@/lib/types";

const statusTone: Record<AssignmentStatus, "slate" | "blue" | "green" | "amber" | "purple"> = {
  not_started: "slate",
  in_progress: "blue",
  submitted: "amber",
  under_review: "purple",
  reviewed: "green",
  completed: "green",
};

export function StatusBadge({ status }: { status: AssignmentStatus }) {
  return <Badge tone={statusTone[status]}>{status.replaceAll("_", " ")}</Badge>;
}
