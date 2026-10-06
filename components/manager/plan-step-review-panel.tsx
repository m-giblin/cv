/** A plan step waiting on manager validation (submitted, or mentor-endorsed). */
export type PlanStepReviewItem = {
  assignmentStepId: string;
  userId: string;
  title: string;
  personName: string;
  stepType: string;
  notes?: string;
  mentorEndorsed?: boolean;
  isManagerGate?: boolean;
};
