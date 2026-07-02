export type ProfileRole =
  | "basic_se"
  | "senior_se"
  | "advisory_solutions_consultant"
  | "mentor"
  | "manager"
  | "director"
  | "admin";

export type SeLevel = "Basic" | "Senior" | "Advisory";

export type PlanStepType =
  | "content_review"
  | "challenge"
  | "simulation"
  | "shadow_meeting_log"
  | "mentor_review"
  | "custom";

export type AssignmentStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "under_review"
  | "reviewed"
  | "completed";

export type Profile = {
  id: string;
  email: string;
  fullName: string;
  role: ProfileRole;
  level: SeLevel;
  managerId: string | null;
  avatarUrl?: string | null;
  createdAt: string;
};

export type Competency = {
  id: string;
  name: string;
  category: string;
  description: string;
};

export type PlanStep = {
  id: string;
  title: string;
  description: string;
  type: PlanStepType;
  order: number;
  status: AssignmentStatus;
  dueDate?: string;
  resourceUrl?: string;
};

export type UserPlan = {
  id: string;
  userId: string;
  mentorId: string | null;
  name: string;
  startDate: string;
  targetCompletion: string;
  status: AssignmentStatus;
  progress: number;
  steps: PlanStep[];
};

export type Challenge = {
  id: string;
  title: string;
  description: string;
  difficulty: "foundational" | "intermediate" | "advanced";
  estimatedMinutes: number;
  linkedSolutions: string[];
  successCriteria: string[];
  isAiGenerated: boolean;
  createdBy: string;
};

export type ChallengeSubmission = {
  id: string;
  userId: string;
  challengeId: string;
  status: AssignmentStatus;
  reflectionText: string;
  managerGrade: number | null;
  managerFeedback: string | null;
  aiSuggestedScore: number | null;
  submittedAt: string | null;
  reviewedAt: string | null;
};

export type SimulationAssignment = {
  id: string;
  assignedTo: string;
  assignedBy: string;
  persona: string;
  vertical: string;
  solutionFocus: string;
  difficulty: "foundational" | "intermediate" | "advanced";
  status: AssignmentStatus;
  transcript: Array<{ speaker: "se" | "persona"; message: string }>;
};

export type CoachingCard = {
  id: string;
  simulationAssignmentId: string;
  userId: string;
  strengths: string[];
  gaps: string[];
  recommendedImprovements: string[];
  score: number;
  linkedCompetencies: string[];
  seReflection: string | null;
  managerReviewStatus: "pending" | "reviewed";
  managerComments: string | null;
  managerGrade: number | null;
  sentToManagerAt: string;
  reviewedAt: string | null;
};

export type ActivityLog = {
  id: string;
  userId: string;
  eventType:
    | "plan_step_completed"
    | "challenge_submitted"
    | "simulation_completed"
    | "coaching_card_reviewed"
    | "manager_feedback_received"
    | "plan_assigned";
  title: string;
  metadata: Record<string, string | number | boolean | null>;
  createdAt: string;
};

export type Notification = {
  id: string;
  userId: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export type DashboardData = {
  currentUser: Profile;
  myOrg: Profile[];
  profiles: Profile[];
  plans: UserPlan[];
  challenges: Challenge[];
  submissions: ChallengeSubmission[];
  simulations: SimulationAssignment[];
  coachingCards: CoachingCard[];
  activity: ActivityLog[];
  competencies: Competency[];
  notifications: Notification[];
};
