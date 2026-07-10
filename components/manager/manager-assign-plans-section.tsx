"use client";

import { AssignPlansWorkspace } from "@/components/plans/assign-plans-workspace";
import type { Profile, ProfileRole, UserPlan } from "@/lib/types";

export function ManagerAssignPlansSection({
  assignees,
  mentors,
  plans,
  viewerRole = "manager",
}: {
  assignees: Profile[];
  mentors: Profile[];
  plans: UserPlan[];
  org?: Profile[];
  viewerRole?: ProfileRole;
}) {
  return (
    <AssignPlansWorkspace
      assignees={assignees}
      mentors={mentors}
      plans={plans}
      viewerRole={viewerRole}
    />
  );
}
